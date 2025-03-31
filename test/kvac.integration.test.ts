import { describe, expect, test } from "vitest";
import { ExtendedCashuMint } from "../src/ExtendedCashuMint";
import { ExtendedCashuWallet } from "../src/ExtendedCashuWallet";

const mintUrl = 'http://localhost:3338';
const unit = 'sat';

describe('test ExtendedCashuWallet integration', () => {
    test('loadMint', async () => {
		const mint = new ExtendedCashuMint(mintUrl);
        const wallet = new ExtendedCashuWallet(mint);
		await wallet.loadMint();

        console.log(JSON.stringify(wallet.kvacKeysets));
		expect(wallet.kvacKeysets.length).toBeGreaterThan(0);
	});
	test('getAllKvacKeysets', async () => {
		const mint = new ExtendedCashuMint(mintUrl);
		const wallet = new ExtendedCashuWallet(mint);
        
        await wallet.getKvacKeySets();
        const keys = await wallet.getAllKvacKeys();

        console.log(JSON.stringify(keys));
		expect(keys).toBeDefined();
		expect(keys.length).toBeGreaterThan(0);
	});
	test('bootstrap', async () => {
		const mint = new ExtendedCashuMint(mintUrl);
		const wallet = new ExtendedCashuWallet(mint);

		await wallet.loadMint();

		const coins = await wallet.bootstrap(20);

		console.log(JSON.stringify(coins, null, 2));
	})
});