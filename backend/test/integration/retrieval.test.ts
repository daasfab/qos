/**
 * Retrieval integration tests — uses jest.spyOn(axios, 'get') to mock network calls.
 * Tests gateway fallback logic, retry behaviour, and 404 handling.
 */
import { jest } from '@jest/globals';
import axios, { AxiosError } from 'axios';
import { fetchFragmentFromIPFS, fetchAllFragments } from '../../utils/retrieval.js';

function makeBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe('Retrieval (mocked axios)', () => {
  let axiosGetSpy: jest.SpiedFunction<typeof axios.get>;

  beforeEach(() => {
    delete process.env['IPFS_GATEWAY'];
    axiosGetSpy = jest.spyOn(axios, 'get') as jest.SpiedFunction<typeof axios.get>;
    axiosGetSpy.mockReset();
  });

  afterEach(() => {
    axiosGetSpy.mockRestore();
  });

  test('fetchFragmentFromIPFS — returns data from first gateway on success', async () => {
    const expectedData = [10, 20, 30, 40];
    axiosGetSpy.mockResolvedValueOnce({ data: makeBuffer(expectedData) } as any);

    const result = await fetchFragmentFromIPFS('bafyfakecid');

    expect(axiosGetSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(new Uint8Array(expectedData));
  });

  test('fetchFragmentFromIPFS — falls back to second gateway on first failure', async () => {
    const expectedData = [1, 2, 3];

    // Gateway 1 (2 attempts fail with network error)
    axiosGetSpy.mockRejectedValueOnce(new AxiosError('ECONNREFUSED'));
    axiosGetSpy.mockRejectedValueOnce(new AxiosError('ECONNREFUSED'));
    // Gateway 2 succeeds
    axiosGetSpy.mockResolvedValueOnce({ data: makeBuffer(expectedData) } as any);

    const result = await fetchFragmentFromIPFS('bafyfakecid');

    expect(result).toEqual(new Uint8Array(expectedData));
    expect(axiosGetSpy).toHaveBeenCalledTimes(3);
  });

  test('fetchFragmentFromIPFS — skips gateway immediately on 404', async () => {
    const expectedData = [99, 88];

    // First gateway returns 404
    const err404 = new AxiosError('Not Found');
    err404.response = { status: 404 } as any;
    axiosGetSpy.mockRejectedValueOnce(err404);

    // Second gateway succeeds
    axiosGetSpy.mockResolvedValueOnce({ data: makeBuffer(expectedData) } as any);

    const result = await fetchFragmentFromIPFS('bafyfakecid');

    expect(result).toEqual(new Uint8Array(expectedData));
    expect(axiosGetSpy).toHaveBeenCalledTimes(2);
  });

  test('fetchFragmentFromIPFS — throws after all gateways fail', async () => {
    axiosGetSpy.mockRejectedValue(new AxiosError('ECONNREFUSED'));

    await expect(fetchFragmentFromIPFS('bafyfakecid')).rejects.toThrow(
      /Failed to fetch CID/,
    );
  });

  test('fetchFragmentFromIPFS — respects IPFS_GATEWAY env var', async () => {
    process.env['IPFS_GATEWAY'] = 'https://my-custom-gateway.example.com';
    const expectedData = [7, 8, 9];

    axiosGetSpy.mockResolvedValueOnce({ data: makeBuffer(expectedData) } as any);

    const result = await fetchFragmentFromIPFS('bafyfakecid');

    expect(result).toEqual(new Uint8Array(expectedData));
    const calledUrl = axiosGetSpy.mock.calls[0]![0];
    expect(calledUrl).toContain('my-custom-gateway.example.com');
  });

  test('fetchAllFragments — fetches all CIDs and returns ordered Uint8Arrays', async () => {
    const frag0 = [1, 2, 3];
    const frag1 = [4, 5, 6];
    const frag2 = [7, 8, 9];

    axiosGetSpy
      .mockResolvedValueOnce({ data: makeBuffer(frag0) } as any)
      .mockResolvedValueOnce({ data: makeBuffer(frag1) } as any)
      .mockResolvedValueOnce({ data: makeBuffer(frag2) } as any);

    const cids = ['cid0', 'cid1', 'cid2'];
    const result = await fetchAllFragments(cids);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(new Uint8Array(frag0));
    expect(result[1]).toEqual(new Uint8Array(frag1));
    expect(result[2]).toEqual(new Uint8Array(frag2));
  });
});
