<p align="right"><a href="./README.en.md">English</a> | <strong>简体中文</strong></p>

# MiniChain · 从零实现的 C++ 区块链

一个使用 **C++20** 从零实现的教学型区块链项目，用来理解 Bitcoin-like 系统中的交易、UTXO、数字签名、PoW 挖矿、Merkle Root 与竞争式出块。

> 项目定位是学习与原理验证，不面向生产环境。

## 核心功能

- **钱包与签名**：基于 OpenSSL / ECDSA 生成密钥与签名交易
- **UTXO 模型**：使用未花费交易输出管理余额
- **Proof of Work**：实现工作量证明挖矿
- **并发矿工**：使用 C++ 多线程模拟竞争出块
- **区块与链**：区块包含 Merkle Root，并通过哈希串联与验证
- **交易池**：待确认交易进入内存池后由矿工打包

## 技术栈

- C++20
- CMake
- OpenSSL
- STL concurrency: `thread`, `mutex`, `atomic`

## 构建

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

运行后会在控制台看到自动生成的交易与矿工竞争产生的新区块。

## 项目状态

**v1.0 / Completed**。核心教学功能已经实现并测试完成，后续不以扩展成真实公链为目标。

## License

MIT
