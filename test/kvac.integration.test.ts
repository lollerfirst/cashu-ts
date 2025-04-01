import { describe, expect, test } from 'vitest';
import { ExtendedCashuMint } from '../src/ExtendedCashuMint';
import { ExtendedCashuWallet } from '../src/ExtendedCashuWallet';
import { AmountAttribute } from 'cashu_kvac';

const mintUrl = 'http://localhost:3338';
const unit = 'sat';

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

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

		expect(coins).toBeDefined();
		expect(coins.length).toBeGreaterThanOrEqual(20);
	});
	test('kvac mint', async () => {
		const mint = new ExtendedCashuMint(mintUrl);
		const wallet = new ExtendedCashuWallet(mint);

		await wallet.loadMint();

		const zeroCoins = await wallet.bootstrap(20);

		const mintQuote = await wallet.createMintQuote(10, 'test');
		await sleep(3000);
		const mintedCoins = await wallet.kvacMint(zeroCoins[0], zeroCoins[1], 10, mintQuote.quote);

		console.log(JSON.stringify(mintedCoins, null, 2));
	});
});
