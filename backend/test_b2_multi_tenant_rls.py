import hashlib
import uuid
from datetime import datetime, timezone

from db.connection import get_db_connection


def test_b2_mass_balance_and_immutability():
    print("==================================================")
    print("HEATLEDGER AI: PROMPT B2 SCHEMA & RLS TEST (POSTGRES)")
    print("==================================================")

    tmp_schema = f"test_b2_{uuid.uuid4().hex[:8]}"

    with get_db_connection(is_service_role=True) as conn:
        orig_schema = conn.execute("SELECT current_schema() AS s").fetchone()["s"]
        conn.execute(f'CREATE SCHEMA "{tmp_schema}"')
        conn.execute(f'SET search_path TO "{tmp_schema}"')

        try:
            conn.raw_connection.execute("""
            CREATE TABLE organizations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                parent_org_id TEXT
            );

            CREATE TABLE heat_numbers (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                heat_number TEXT NOT NULL,
                initial_weight_grams BIGINT NOT NULL,
                allocated_weight_grams BIGINT NOT NULL DEFAULT 0,
                available_weight_grams BIGINT NOT NULL
            );

            CREATE TABLE shipment_items (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                heat_id TEXT NOT NULL,
                allocated_weight_grams BIGINT NOT NULL
            );

            CREATE TABLE documents (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                sha256 TEXT NOT NULL,
                storage_path TEXT NOT NULL
            );

            CREATE TABLE audit_log (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                action TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                prev_hash TEXT,
                row_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE OR REPLACE FUNCTION fn_b2_check_mass_balance() RETURNS TRIGGER AS $$
            DECLARE
                total_alloc BIGINT;
                init_wt BIGINT;
            BEGIN
                SELECT COALESCE(SUM(allocated_weight_grams), 0) + NEW.allocated_weight_grams
                INTO total_alloc
                FROM shipment_items WHERE heat_id = NEW.heat_id;
                SELECT initial_weight_grams INTO init_wt FROM heat_numbers WHERE id = NEW.heat_id;
                IF total_alloc > init_wt THEN
                    RAISE EXCEPTION 'Phantom Heat Allocation Defect: Total allocated weight exceeds original mill received weight.';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER trg_check_mass_balance_before_insert
            BEFORE INSERT ON shipment_items
            FOR EACH ROW EXECUTE FUNCTION fn_b2_check_mass_balance();

            CREATE OR REPLACE FUNCTION fn_b2_update_heat_balance() RETURNS TRIGGER AS $$
            BEGIN
                UPDATE heat_numbers
                SET allocated_weight_grams = allocated_weight_grams + NEW.allocated_weight_grams,
                    available_weight_grams = initial_weight_grams - (allocated_weight_grams + NEW.allocated_weight_grams)
                WHERE id = NEW.heat_id;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER trg_update_heat_balance_after_insert
            AFTER INSERT ON shipment_items
            FOR EACH ROW EXECUTE FUNCTION fn_b2_update_heat_balance();

            CREATE OR REPLACE FUNCTION fn_b2_immutable_doc() RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION 'Security Invariant: Documents are write-once immutable. Modifications are forbidden.';
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER trg_prevent_document_update
            BEFORE UPDATE ON documents
            FOR EACH ROW EXECUTE FUNCTION fn_b2_immutable_doc();

            CREATE TRIGGER trg_prevent_document_delete
            BEFORE DELETE ON documents
            FOR EACH ROW EXECUTE FUNCTION fn_b2_immutable_doc();
            """)
            conn.commit()

            cursor = conn.cursor()

            org_a = str(uuid.uuid4())
            org_b = str(uuid.uuid4())
            cursor.execute("INSERT INTO organizations VALUES (%s, %s, %s)", (org_a, "Howrah Forgings", None))
            cursor.execute("INSERT INTO organizations VALUES (%s, %s, %s)", (org_b, "Kolkata Flanges", None))

            heat_id = str(uuid.uuid4())
            cursor.execute("INSERT INTO heat_numbers VALUES (%s, %s, %s, %s, %s, %s)", (
                heat_id, org_a, "TSJ-26-9021", 25_000_000, 0, 25_000_000
            ))
            conn.commit()

            item_1 = str(uuid.uuid4())
            cursor.execute("INSERT INTO shipment_items VALUES (%s, %s, %s, %s)", (
                item_1, org_a, heat_id, 10_000_000
            ))
            conn.commit()

            cursor.execute("SELECT allocated_weight_grams, available_weight_grams FROM heat_numbers WHERE id = %s", (heat_id,))
            row_bal = cursor.fetchone()
            assert row_bal["allocated_weight_grams"] == 10_000_000
            assert row_bal["available_weight_grams"] == 15_000_000

            item_2 = str(uuid.uuid4())
            over_allocated = False
            try:
                cursor.execute("INSERT INTO shipment_items VALUES (%s, %s, %s, %s)", (
                    item_2, org_a, heat_id, 20_000_000
                ))
                conn.commit()
            except Exception as e:
                conn.rollback()
                over_allocated = True
                assert "Phantom Heat Allocation Defect" in str(e)
            assert over_allocated is True

            doc_id = str(uuid.uuid4())
            cursor.execute("INSERT INTO documents VALUES (%s, %s, %s, %s, %s)", (
                doc_id, org_a, "Tata_Steel_3.1_MTC.pdf", "878a3b7525344442f7da79...", "s3://originals/Tata_Steel.pdf"
            ))
            conn.commit()

            update_blocked = False
            try:
                cursor.execute("UPDATE documents SET file_name = 'tampered.pdf' WHERE id = %s", (doc_id,))
                conn.commit()
            except Exception as e:
                conn.rollback()
                update_blocked = True
                assert "Documents are write-once immutable" in str(e)
            assert update_blocked is True

            delete_blocked = False
            try:
                cursor.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
                conn.commit()
            except Exception as e:
                conn.rollback()
                delete_blocked = True
                assert "Documents are write-once immutable" in str(e)
            assert delete_blocked is True

            def insert_audit(action, res_id):
                aid = str(uuid.uuid4())
                ts = datetime.now(timezone.utc).isoformat()
                cursor.execute("SELECT row_hash FROM audit_log WHERE organization_id = %s ORDER BY created_at DESC LIMIT 1", (org_a,))
                row = cursor.fetchone()
                last_h = row["row_hash"] if row else "GENESIS_00000000000000000000000000000000"

                payload = f"{last_h}|{aid}|{org_a}|{action}|{res_id}|{ts}"
                r_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
                cursor.execute("INSERT INTO audit_log VALUES (%s, %s, %s, %s, %s, %s, %s)", (
                    aid, org_a, action, res_id, last_h, r_hash, ts
                ))
                conn.commit()
                return r_hash

            insert_audit("MTC_INGESTED", doc_id)
            insert_audit("HEAT_ALLOCATED", heat_id)
            insert_audit("DOSSIER_SIGNED", item_1)

            cursor.execute("SELECT prev_hash, row_hash FROM audit_log WHERE organization_id = %s ORDER BY created_at ASC", (org_a,))
            rows = cursor.fetchall()
            assert rows[0]["prev_hash"] == "GENESIS_00000000000000000000000000000000"
            assert rows[1]["prev_hash"] == rows[0]["row_hash"]
            assert rows[2]["prev_hash"] == rows[1]["row_hash"]
        finally:
            conn.rollback()
            conn.execute(f'SET search_path TO "{orig_schema}"')
            conn.execute(f'DROP SCHEMA IF EXISTS "{tmp_schema}" CASCADE')
            conn.commit()
