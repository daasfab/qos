# Qos (Қос)

Qos is a decentralized, open-source file-sharing ecosystem built on top of the [InterPlanetary File System (IPFS)](https://ipfs.tech/). Designed for resilient, peer-to-peer data exchaxnge, Qos empowers users to securely share, access, and distribute files across a decentralized network without relying on centralized servers.

<br>

## > Architecture and Repository structure

To ensure consistency and streamline development across platforms, this project follows a **monorepo** structure. All client applications and shared libraries are housed within this single repository. 

### - Workspace Directory

* 📁 **`qos/mobile`**
  The mobile client app, built with **React Native**. It provides a native, seamless experience for iOS and Android users to interact with the Qos network on the go.
  
* 📁 **`qos/web`**
  The web-based client, built with **React**. It allows users to access the decentralized file-sharing platform directly from their browsers.
  
* 📁 **`qos/shared`**
  The central library for shared codebase and business logic. This directory contains the core **IPFS configuration, connection logic, and helper functions** utilized by both the web and mobile apps, keeping the codebase clean and free of duplicated code.

### - Tech Stack
* **Frontend Clients:** React, React Native
* **Network Protocol:** IPFS

<br>

## > Contributing 

Contributions are welcomed! 😎

This project is built by humans, for humans. **Please no AI slop**. While I understand that using llm's is great for automating repetitive or simple tasks, please keep it to a minimum. If you submit a pull-request with code written with the help of AI, you must clearly state so in the PR description. 


### - Bugs & Feature proposals

* If you find any bugs or experience any crashes, please document it (keeping a record of everything you've done to get to this point, so that I could recreate it) and create an Issue. Any screenshots/screen recordings of the bug are welcomed!
* Features should be proposed the same way, by creating an Issue. I will try to address it as soon as I can!

### - Submitting a pull request

* To submit a pull-request, discuss the change in the Issues section, then fork this repo and get on with the (hopefully) exciting work! 

<br>

## ❕  Important Info

* This project is under work, so it may not look well organised at any one point. I am constantly working toward improving it 🙂
