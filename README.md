# Qos (Қос)

Qos is a decentralized, open-source private messaging platform built on top of the [InterPlanetary File System (IPFS)](https://ipfs.tech/). Designed for resilient, peer-to-peer data exchaxnge, Qos empowers users to communicate privately. 

This project is inspired by (and is a recreation of) [Vereign](https://docs.ipfs.tech/case-studies/vereign/#overview). **It's not to be used for commercial means**.

<br>

## > Architecture and Repository structure

To ensure consistency and streamline development across platforms, this project follows a **monorepo** structure. All client applications and shared libraries are housed within this single repository. 

### - Workspace Directory

* 📁 **`qos/web`**
  The web-based client, built with **React**. It allows users to access the decentralized file-sharing platform directly from their browsers.

* 📁 **`qos/mobile`**
  The mobile client app, built with **React Native**. It provides a native, seamless experience for iOS and Android users to interact with the Qos network on the go. (**Future addition**)
  
* 📁 **`qos/backend`**
  The central library for shared codebase and business logic. This directory contains the core **IPFS config, connection logic, and helper functions**. 

### - Tech Stack
* **Frontend Clients:** React
* **Network Protocol:** IPFS

<br>

## > Contributing 

Contributions are welcomed! 😎

This project is built by humans, for humans. **Pls no AI slop**. While I understand that using llm's is very helpful, please keep it to a minimum. If you submit a pull-request with code written with the help of AI, please clearly state so in the PR description. 


### - Bugs & Feature proposals

* If you find any bugs or experience any crashes, please document it (keeping a record of everything you've done to get to this point, so that I could recreate it) and create an Issue. Any screenshots/screen recordings of the bug are welcomed!
* Features should be proposed the same way, by creating an Issue. I will try to address it as soon as I can!

### - Submitting a pull request

* To submit a pull-request, discuss the change in the Issues section, then fork this repo and get on with the (hopefully) exciting work! 

<br>

## ❕  Important Info

* This project is under work, so it may not look well organised at any one point. I am constantly working toward improving it 🙂
