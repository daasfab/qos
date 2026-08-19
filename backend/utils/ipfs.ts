import axios from 'axios';
import FormData from 'form-data';
import { fragment } from './encryption.js';

// TODO: this is an experimental temp port, adjust it later. And this is a draft, need to come back to this when i have time
const CLUSTER_API_URL = 'http://127.0.0.1:9094';

export async function pinFragmentToCluster(fragment: Buffer, index: number): Promise<string> {
  const form = new FormData();

  form.append('file', fragment, { filename: `fragment-${index}.bin` });

  try {
    const response = await axios.post(`${CLUSTER_API_URL}/add`, form, {
      headers: {
        ...form.getHeaders(),
      },
      params: {
        local: true, 
      }
    });

    console.log('ipfs cluster response:', response.data); //test

    const cidData = response.data.cid;
    const cidString = typeof cidData === 'string' ? cidData : cidData?.['/'];

    if (!cidString) {
      throw new Error('Failed to extract CID string from cluster response.');
    }

    return cidString;
  } catch (error) {
    console.error(`Failed to pin fragment ${index} to IPFS Cluster:`, error);
    throw error;
  }
}

export async function pinAllFragments(fragments: Buffer[]): Promise<string[]> {
  const cids: string[] = [];

  for (let i = 0; i < fragments.length; i++) {

    if (!fragments[i]) throw new Error("Missing fragments");

    const cid = await pinFragmentToCluster(fragments[i]!, i);
    cids.push(cid);
  }

  return cids;
}