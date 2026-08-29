<p align="right"><strong>English</strong> | <a href="./README.md">简体中文</a></p>

# MiniChain · A Blockchain Implementation from Scratch in C++

A teaching-oriented blockchain implementation built from scratch with **C++20** to understand the core mechanics of Bitcoin-like systems: transactions, UTXO accounting, digital signatures, Proof of Work, Merkle roots, and competitive mining.

> This project is intended for learning and system-level experimentation, not production use.

## Core Features

- **Wallets & signatures**: OpenSSL / ECDSA key generation and transaction signing
- **UTXO model**: balance management through unspent transaction outputs
- **Proof of Work**: basic PoW mining
- **Concurrent miners**: C++ threads simulate competing miners
- **Blocks & chain**: Merkle root, hashing, linking, and validation
- **Transaction pool**: pending transactions are collected before being mined

## Tech Stack

- C++20
- CMake
- OpenSSL
- STL concurrency: `thread`, `mutex`, `atomic`

## Build

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install build-essential cmake libssl-dev
```

### macOS

```bash
brew install cmake openssl
```

### Compile & Run

```bash
git clone https://github.com/nohyh/cpp-blockchain.git
cd cpp-blockchain
mkdir build && cd build
cmake ..
make
./BLOCKCHAIN_SYSTEM
```

The console will display auto-generated transactions and newly mined blocks.

## Status

**v1.0 / Completed.** The core educational goals are implemented and tested. The project is not intended to evolve into a production blockchain.

## License

MIT
