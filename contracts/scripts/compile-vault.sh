#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔨 Yearn V3 Vault Compilation Script${NC}"
echo "======================================"

# Check if vyper is installed
echo -e "\n${YELLOW}Checking vyper installation...${NC}"
if ! command -v vyper &> /dev/null; then
    echo -e "${RED}✗ Vyper not found${NC}"
    echo -e "${YELLOW}Installing vyper 0.3.x (compatible with Python 3.11+)...${NC}"
    # Try different installation methods based on OS
    if command -v pipx &> /dev/null; then
        echo -e "${YELLOW}Trying pipx (recommended)...${NC}"
        pipx install vyper==0.3.10
    elif pip3 install --break-system-packages vyper==0.3.10 2>/dev/null; then
        echo -e "${GREEN}✓ Installed via pip3${NC}"
    elif pip install --break-system-packages vyper==0.3.10 2>/dev/null; then
        echo -e "${GREEN}✓ Installed via pip${NC}"
    else
        echo -e "${RED}✗ Failed to install vyper${NC}"
        echo -e "${YELLOW}Please install manually:${NC}"
        echo -e "  pipx install vyper==0.3.10"
        echo -e "  OR"
        echo -e "  pip3 install --break-system-packages vyper==0.3.10"
        exit 1
    fi
else
    VYPER_VERSION=$(vyper --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    echo -e "${GREEN}✓ Vyper found: version $VYPER_VERSION${NC}"

    # Check if version is 0.3.x (compatible with Vault.vy)
    if [[ ! "$VYPER_VERSION" =~ ^0\.3\. ]]; then
        echo -e "${YELLOW}⚠ Warning: Expected vyper 0.3.x, found $VYPER_VERSION${NC}"
        echo -e "${YELLOW}Vault.vy may not compile with this version${NC}"
    fi
fi

# Check if Vault.vy exists
VAULT_FILE="contracts/vault/Vault.vy"
if [[ ! -f "$VAULT_FILE" ]]; then
    echo -e "${RED}✗ $VAULT_FILE not found!${NC}"
    echo -e "${YELLOW}Vault.vy is missing${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Compiling Vault.vy...${NC}"
mkdir -p contracts/artifacts

# Compile Vault.vy and extract ABI and bytecode
vyper "$VAULT_FILE" -f abi,bytecode,bytecode_runtime > contracts/artifacts/Vault.json.tmp

if [[ $? -ne 0 ]]; then
    echo -e "${RED}✗ Compilation failed!${NC}"
    rm -f contracts/artifacts/Vault.json.tmp
    exit 1
fi

# Format as proper JSON using Node.js
echo -e "${YELLOW}Formatting artifacts...${NC}"
node -e "
const fs = require('fs');
const data = fs.readFileSync('contracts/artifacts/Vault.json.tmp', 'utf8');
const lines = data.split('\n');

try {
    const artifact = {
        contractName: 'VaultV3',
        abi: JSON.parse(lines[0]),
        bytecode: '0x' + lines[1],
        deployedBytecode: '0x' + lines[2]
    };

    fs.writeFileSync('contracts/artifacts/Vault.json', JSON.stringify(artifact, null, 2));
    fs.unlinkSync('contracts/artifacts/Vault.json.tmp');

    const abiLength = artifact.abi.length;
    const bytecodeSize = (artifact.bytecode.length - 2) / 2;

    console.log('✓ Vault.vy compiled successfully');
    console.log('  - ABI functions:', abiLength);
    console.log('  - Bytecode size:', bytecodeSize, 'bytes');
    process.exit(0);
} catch (error) {
    console.error('✗ Error formatting artifacts:', error.message);
    process.exit(1);
}
"

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ Compilation complete!${NC}"
    echo -e "${GREEN}  Artifacts saved to: contracts/artifacts/Vault.json${NC}"
else
    echo -e "${RED}✗ Failed to format artifacts${NC}"
    exit 1
fi
