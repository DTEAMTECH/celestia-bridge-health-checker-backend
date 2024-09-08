const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());

app.post('/proxy', async (req, res) => {
    const { ip, port, token } = req.body;

    if (!ip || !port || !token) {
        return res.status(400).json({ error: 'Missing ip, port or token' });
    }

    if (typeof ip !== 'string' || typeof port !== 'number' || typeof token !== 'string') {
        return res.status(400).json({ error: 'Invalid ip, port or token format' });
    }

    const url = `http://${ip}:${port}`;
    const data = {
        id: 1,
        jsonrpc: "2.0",
        method: "header.LocalHead",
        params: []
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const response = await axios.post(url, data, { headers });
        const result = response.data.result;

        const chainId = result.header.chain_id;
        const height = parseInt(result.header.height, 10);

        let statusUrl = '';

        if (chainId === 'mocha-4') {
            statusUrl = 'https://rpc.celestia.testnet.dteam.tech/status';
        } else if (chainId === 'celestia') {
            statusUrl = 'https://rpc.celestia.mainnet.dteam.tech/status';
        } else {
            return res.status(400).json({ error: 'Unknown chain id' });
        }

        const statusResponse = await axios.get(statusUrl);
        const latestBlockHeight = parseInt(statusResponse.data.result.sync_info.latest_block_height, 10);

        if (height < latestBlockHeight) {
            const delay = latestBlockHeight - height;

            if (chainId === 'mocha-4') {
                return res.json({
                    message: `Warning: Your testnet bridge node is behind the chain, ${delay} blocks behind.`,
                    data: result
                });
            } else if (chainId === 'celestia') {
                return res.json({
                    message: `Warning: Your mainnet bridge node is behind the chain, ${delay} blocks behind.`,
                    data: result
                });
            }

        } else {
            if (chainId === 'mocha-4') {
                return res.json({
                    message: 'Your testnet bridge node is synchronized with the chain.',
                    data: result
                });
            } else if (chainId === 'celestia') {
                return res.json({
                    message: 'Your mainnet bridge node is synchronized with the chain.',
                    data: result
                });
            }

        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Proxy server listening on port ${port}`);
});