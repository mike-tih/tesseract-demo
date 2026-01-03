# Quick Start Guide

## ⚡ Быстрый деплой на Sepolia

### 1️⃣ Подготовка (5 мин)

```bash
# Клонируйте/перейдите в проект
cd tesseract-demo

# Contracts
cd contracts
npm install

# Frontend
cd ../frontend
npm install
```

### 2️⃣ Настройка `.env` (2 мин)

**contracts/.env:**
```env
# Получите на https://alchemy.com или https://infura.io
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Ваш приватный ключ (БЕЗ 0x)
PRIVATE_KEY=ваш_приватный_ключ

# Sepolia USDC (найдите актуальный адрес)
USDC_ADDRESS=0x...

# Опционально: admin адрес (если пусто - будет deployer)
ADMIN_ADDRESS=
```

**frontend/.env.local:**
```env
# Получите на https://cloud.walletconnect.com
VITE_WALLET_CONNECT_ID=your_project_id

# RPC URL
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# После деплоя контрактов вставите сюда адрес vault
VITE_VAULT_ADDRESS=

# Sepolia USDC
VITE_USDC_ADDRESS=0x...

# Sepolia chain ID
VITE_DEFAULT_CHAIN_ID=11155111
```

### 3️⃣ Деплой контрактов (3 мин)

```bash
cd contracts

# Компилируем Vault.vy
npm run compile:vault

# Деплоим
npm run deploy:sepolia

# ⚠️ СКОПИРУЙТЕ АДРЕС VAULT ИЗ ВЫВОДА!

# Конфигурируем (даёт админу права + устанавливает лимиты)
npm run configure:sepolia
```

### 4️⃣ Обновляем frontend (1 мин)

```bash
cd ../frontend

# Вставьте адрес vault в .env.local
echo "VITE_VAULT_ADDRESS=0x..." >> .env.local

# Опционально: обновите ABI (для продакшна)
# Скопируйте ABI из contracts/artifacts/Vault.json
# в frontend/src/config/contracts.ts
```

### 5️⃣ Запускаем frontend (1 мин)

```bash
cd frontend
npm run dev

# Откройте http://localhost:3000
```

### 6️⃣ Добавляем стратегии через UI (5 мин)

```
1. Подключите кошелёк (Sepolia testnet)
2. Перейдите на страницу Admin
3. В секции "Add New Strategy":
   - Вставьте адрес ERC-4626 vault (MetaMorpho или другой)
   - Нажмите "Add Strategy"
   - Повторите для каждой стратегии

4. В секции "Rebalance Capital":
   - Выберите стратегию
   - Установите Target Debt (максимальный лимит)
   - Нажмите "Update Debt"

   ИЛИ используйте "Equal Allocation" для автоматического распределения
```

## 📋 Где взять стратегии?

### Для Sepolia (тестнет):
- Поищите тестовые ERC-4626 vaults на Sepolia
- Или задеплойте простые mock ERC-4626 контракты для тестов

### Для Mainnet (продакшн):
1. Перейдите на [app.morpho.blue](https://app.morpho.blue)
2. Отфильтруйте по USDC vaults
3. Сортируйте по APY
4. Проверьте:
   - ✅ Liquidity (>$1M рекомендуется)
   - ✅ Audited (есть аудит)
   - ✅ Historical performance
5. Скопируйте адреса лучших 2-4 vaults

## 🎯 Готово!

Теперь у вас:
- ✅ Задеплоенный Yearn V3 vault на Sepolia
- ✅ Работающий frontend на localhost:3000
- ✅ Возможность добавлять стратегии через UI

## 🧪 Тестирование

### User Flow:
1. Получите testnet USDC на Sepolia
2. Approve USDC для vault
3. Deposit USDC
4. Проверьте что баланс обновился
5. Withdraw USDC обратно

### Admin Flow:
1. Добавьте 2-3 стратегии
2. Установите debt limits
3. Сделайте rebalance
4. Проверьте Strategy Breakdown на User странице

## 🚀 Production Deployment

Когда всё протестировано:

```bash
# Deploy на mainnet
cd contracts
npm run deploy:mainnet
npm run configure:mainnet

# Update frontend .env.local
VITE_VAULT_ADDRESS=<mainnet_vault_address>
VITE_DEFAULT_CHAIN_ID=1
VITE_USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48

# Build & deploy frontend
cd frontend
npm run build
# Deploy dist/ на Vercel/Netlify
```

## ❓ Troubleshooting

**Ошибка: "Vault address not configured"**
- Проверьте что `VITE_VAULT_ADDRESS` в `.env.local`

**Ошибка: "Access Denied" на Admin странице**
- Проверьте что подключили правильный кошелёк (admin)
- Проверьте что `configure.ts` успешно выполнился

**Транзакции не проходят**
- Проверьте баланс ETH на кошельке (для gas)
- Проверьте что вы на правильной сети (Sepolia/Mainnet)

**Стратегия не добавляется**
- Проверьте что адрес валидный и это ERC-4626 vault
- Проверьте что у вас есть права ADD_STRATEGY_MANAGER

## 📚 Документация

- `README.md` - Общая информация
- `IMPLEMENTATION_STATUS.md` - Детальный статус проекта
- `contracts/README.md` - Документация контрактов
- `frontend/README.md` - Документация фронтенда

## 💬 Поддержка

Если что-то не работает:
1. Проверьте все .env файлы
2. Проверьте что все npm install выполнены
3. Проверьте логи в консоли браузера (F12)
4. Проверьте transaction hashes в Etherscan
