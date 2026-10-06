import axios from 'axios';
import { decrypt, reassemble } from './encryption.js';

const GATEWAY_URL = 'http://127.0.0.1:8080'; // Kubo HTTP Gateway

export async function fetchFragmentFromIPFS(cid: string): Promise<Buffer> {
    try {
        const response = await axios.get(`${GATEWAY_URL}/ipfs/${cid}`, {
            responseType: 'arraybuffer',
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error(`Failed to fetch fragment ${cid} from IPFS:`, error);
        throw error;
    }
}

export async function retrieveAndDecryptMessage(cids: string[], key: Buffer): Promise<string> {
    // Fetch all fragments in parallel
    const fragmentPromises = cids.map(cid => fetchFragmentFromIPFS(cid));
    const fragments = await Promise.all(fragmentPromises);

    const payload = reassemble(fragments);
    return decrypt(payload, key);
}