# Backend Documentation

When ecnrypting and fragmenting user text (messages), I'm using a seperate checksum logic to check if any fragments are corrupted/missing, since my architecture already has two robust layers of integrity checking built into it by defualt:

1. GCM auth tag, which acts as a cryptographic checksum. I.e., if any fragment is corrupt/out of order/missing, the ciphertext will change and verification will fail.

2. IPFS Content Identifiers (CIDs) are a cryptographic hash of the data it points to. Thus, the network mathematically guarantees it only returns the exact bytes that originally created that CID. If a fragment goes missing entirely from the network, the http request will simply fail to resolve.

This convinience and smart design is exactly why I love ipfs!

## Technical specs:

**1. Encryption**

 - I'm using AES with a 256-bit master key and a "Galois/Counter Mode" (aka GCM) mode of operation. Meaning that it doesnt just encrypt the data but also mathematically signs it to prove it hasn't been altered (ie verify its integrity). Read more [here](https://en.wikipedia.org/wiki/Galois/Counter_Mode).
