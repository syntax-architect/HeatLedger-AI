import { describe, it, expect } from 'vitest';
import { validateMtcFile, ALLOWED_MTC_MIME_TYPES, MAX_MTC_FILE_SIZE_BYTES } from '../services/api';

describe('Frontend API Client Security Validation', () => {
  it('allows valid PDF mill test certificates under 10MB', () => {
    const validPdf = new File(['%PDF-1.4 sample content'], 'sample_mtc.pdf', {
      type: 'application/pdf',
    });
    expect(() => validateMtcFile(validPdf)).not.toThrow();
  });

  it('allows valid PNG and JPEG image scans under 10MB', () => {
    const validPng = new File(['fake-png-content'], 'scan.png', {
      type: 'image/png',
    });
    const validJpeg = new File(['fake-jpeg-content'], 'scan.jpg', {
      type: 'image/jpeg',
    });
    expect(() => validateMtcFile(validPng)).not.toThrow();
    expect(() => validateMtcFile(validJpeg)).not.toThrow();
  });

  it('rejects disallowed file types such as exe, zip, html', () => {
    const badExe = new File(['binary content'], 'script.exe', {
      type: 'application/x-msdownload',
    });
    expect(() => validateMtcFile(badExe)).toThrow(/Security Policy Violation: File format/);

    const badZip = new File(['zip content'], 'archive.zip', {
      type: 'application/zip',
    });
    expect(() => validateMtcFile(badZip)).toThrow(/Security Policy Violation: File format/);
  });

  it('rejects files larger than 10MB', () => {
    // Create dummy object mimicking oversized File
    const largeFile = {
      name: 'giant.pdf',
      type: 'application/pdf',
      size: MAX_MTC_FILE_SIZE_BYTES + 1024,
    } as File;

    expect(() => validateMtcFile(largeFile)).toThrow(/exceeds the maximum allowed 10MB threshold/);
  });
});
