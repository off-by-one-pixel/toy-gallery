import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config', () => ({
  API_CONFIG: { baseUrl: 'http://test.local' },
}));

vi.mock('@/api/generated/sdk', () => ({
  toysTokenCreate: vi.fn(),
  toysChangePasswordCreate: vi.fn(),
  toysToysList: vi.fn(),
  toysToysCreate: vi.fn(),
  toysToysDestroy: vi.fn(),
  toysToysPartialUpdate: vi.fn(),
  toysToysExportRetrieve: vi.fn(),
  toysToysImportCreate: vi.fn(),
  toysToysDeleteAllDestroy: vi.fn(),
  toysSessionsList: vi.fn(),
  toysSessionsRetrieve: vi.fn(),
  toysSessionsCreate: vi.fn(),
  toysSessionsUpdate: vi.fn(),
  toysSessionsDestroy: vi.fn(),
}));

import {
  toysSessionsCreate,
  toysTokenCreate,
  toysToysCreate,
  toysToysExportRetrieve,
  toysToysImportCreate,
} from '@/api/generated/sdk';
import { createSession, createToy, downloadExport, importFromFile, login } from '@/api/index';
import { localDateKey } from '@/lib/dates';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('downloadExport', () => {
  it('builds a JSON blob, triggers a download, and revokes the URL on a timer', async () => {
    vi.useFakeTimers();
    const payload = { toys: [{ id: 1 }], sessions: [] };
    vi.mocked(toysToysExportRetrieve).mockResolvedValue(
      payload as unknown as Awaited<ReturnType<typeof toysToysExportRetrieve>>,
    );

    const createSpy = vi.fn<(b: Blob) => string>(() => 'blob:fake');
    const revokeSpy = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: createSpy, revokeObjectURL: revokeSpy });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadExport();

    expect(createSpy).toHaveBeenCalledTimes(1);
    const blob = createSpy.mock.calls[0][0];
    expect(blob.type).toBe('application/json');
    await expect(blob.text()).resolves.toBe(JSON.stringify(payload, null, 2));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('a')).toBeNull();

    expect(revokeSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeSpy).toHaveBeenCalledWith('blob:fake');

    clickSpy.mockRestore();
  });

  it('names the file toy-gallery-<today>.json', async () => {
    vi.mocked(toysToysExportRetrieve).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof toysToysExportRetrieve>>,
    );

    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    const anchors: HTMLAnchorElement[] = [];
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(<T extends Node>(node: T) => {
      if (node instanceof HTMLAnchorElement) anchors.push(node);
      return node;
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadExport();

    const today = localDateKey(new Date());
    expect(anchors[0].download).toBe(`toy-gallery-${today}.json`);
    appendSpy.mockRestore();
  });
});

describe('importFromFile', () => {
  it('reads JSON from the file, forwards it to the SDK, and returns the camel-cased counts', async () => {
    const envelope = { toys: [{ id: 1 }], sessions: [{ id: 2 }] };
    const file = new File([JSON.stringify(envelope)], 'export.json', { type: 'application/json' });
    vi.mocked(toysToysImportCreate).mockResolvedValue({ toys_created: 1, sessions_created: 2 } as Awaited<
      ReturnType<typeof toysToysImportCreate>
    >);

    const result = await importFromFile(file);

    expect(vi.mocked(toysToysImportCreate)).toHaveBeenCalledWith(envelope);
    expect(result).toEqual({ toysCreated: 1, sessionsCreated: 2 });
  });

  it('rejects when the file body is not valid JSON', async () => {
    const file = new File(['{ not json'], 'broken.json');
    await expect(importFromFile(file)).rejects.toBeInstanceOf(SyntaxError);
  });
});

describe('createToy', () => {
  it('snake-cases the outgoing payload and camel-cases the SDK response', async () => {
    vi.mocked(toysToysCreate).mockResolvedValue({
      id: 7,
      brand: 'B',
      name: 'N',
      size: '',
      usage_count: 0,
      total_duration_minutes: 0,
      records: [],
      max_duration_minutes: 0,
      shape: { sections: [], top_section_shape: 'CONE' },
      custom_attributes: { color: 'red' },
      date_purchased: null,
      insertable_length: 100,
    } as Awaited<ReturnType<typeof toysToysCreate>>);

    const result = await createToy({
      brand: 'B',
      name: 'N',
      size: '',
      shape: { sections: [], topSectionShape: 'CONE' },
      customAttributes: { color: 'red' },
      datePurchased: null,
      insertableLength: 100,
    } as Parameters<typeof createToy>[0]);

    const sdkPayload = vi.mocked(toysToysCreate).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(sdkPayload).toMatchObject({
      brand: 'B',
      custom_attributes: { color: 'red' },
      date_purchased: null,
      insertable_length: 100,
    });
    expect(result).toMatchObject({
      id: 7,
      customAttributes: { color: 'red' },
      datePurchased: null,
      insertableLength: 100,
      shape: { topSectionShape: 'CONE' },
    });
  });
});

describe('createSession', () => {
  it('snake-cases the outgoing payload and camel-cases the SDK response', async () => {
    vi.mocked(toysSessionsCreate).mockResolvedValue({
      id: 11,
      started_at: '2026-05-17T10:00:00Z',
      ended_at: null,
      entries: [],
    } as unknown as Awaited<ReturnType<typeof toysSessionsCreate>>);

    const result = await createSession({
      startedAt: '2026-05-17T10:00:00Z',
      endedAt: null,
      entries: [],
    } as Parameters<typeof createSession>[0]);

    const sdkPayload = vi.mocked(toysSessionsCreate).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(sdkPayload).toMatchObject({
      started_at: '2026-05-17T10:00:00Z',
      ended_at: null,
    });
    expect(result).toMatchObject({
      id: 11,
      startedAt: '2026-05-17T10:00:00Z',
      endedAt: null,
    });
  });
});

describe('login', () => {
  it('forwards credentials to the SDK and returns the token pair', async () => {
    vi.mocked(toysTokenCreate).mockResolvedValue({ access: 'A', refresh: 'R' } as Awaited<
      ReturnType<typeof toysTokenCreate>
    >);

    const tokens = await login('alice', 'pw');

    expect(vi.mocked(toysTokenCreate)).toHaveBeenCalledWith({ username: 'alice', password: 'pw' });
    expect(tokens).toEqual({ access: 'A', refresh: 'R' });
  });
});
