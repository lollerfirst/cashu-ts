import { describe, expect, test } from 'vitest';
import { ExtendedCashuMint } from '../src/ExtendedCashuMint';
import { ExtendedCashuWallet } from '../src/ExtendedCashuWallet';

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
		await sleep(2000);
		const mintedCoins = await wallet.kvacMint(zeroCoins[0], zeroCoins[1], 10, mintQuote.quote);

		expect(mintedCoins).toBeDefined();
		expect(mintedCoins.length).toEqual(2);
		expect(mintedCoins[0].amount).toEqual(0);
		expect(mintedCoins[1].amount).toEqual(10);
	});
	test('kvac send', async () => {
		const mint = new ExtendedCashuMint(mintUrl);
		const wallet = new ExtendedCashuWallet(mint);

		await wallet.loadMint();

		const zeroCoins = await wallet.bootstrap(10);

		const mintQuote = await wallet.createMintQuote(1337, 'test');

		// Wait for the quote to be marked as paid
		await sleep(2000);

		// mint
		const mintedCoins = await wallet.kvacMint(zeroCoins[0], zeroCoins[1], 1337, mintQuote.quote);

		// send
		const [sendCoin, keepCoin] = await wallet.kvacSend(13, mintedCoins[1], mintedCoins[0]);

		expect(sendCoin).toBeDefined();
		expect(sendCoin.amount).toEqual(13);
		
		expect(keepCoin).toBeDefined();
		expect(keepCoin.amount).toBeLessThanOrEqual(1337-13);
	});
	test('kvac receive', async () => {
		const mint = new ExtendedCashuMint(mintUrl);
		const wallet = new ExtendedCashuWallet(mint);

		await wallet.loadMint();

		const zeroCoins = await wallet.bootstrap(10);

		const mintQuote = await wallet.createMintQuote(1337, 'test');
		const mintQuote1 = await wallet.createMintQuote(2001, 'test1');

		// Wait for the quote to be marked as paid
		await sleep(2000);

		// mint
		const mintedCoins = await wallet.kvacMint(zeroCoins[0], zeroCoins[1], 1337, mintQuote.quote);
		const mintedCoins1 = await wallet.kvacMint(zeroCoins[2], zeroCoins[3], 2001, mintQuote1.quote);

		const [_zeroCoin, newBalanceCoin] = await wallet.kvacReceive(mintedCoins1[1], mintedCoins[1]);

		expect(newBalanceCoin).toBeDefined();
		expect(newBalanceCoin.amount).toBeLessThanOrEqual(3338);
	})
});
