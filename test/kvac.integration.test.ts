import { describe, expect, test } from 'vitest';
import { ExtendedCashuMint } from '../src/ExtendedCashuMint';
import { ExtendedCashuWallet } from '../src/ExtendedCashuWallet';
import { MeltQuoteResponse, MeltQuoteState } from '../src/model/types';

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
		expect(keepCoin.amount).toBeLessThanOrEqual(1337 - 13);
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
	});
	/*
	test('kvac melt', async () => {
		const mint = new ExtendedCashuMint(mintUrl);
		const wallet = new ExtendedCashuWallet(mint);

		const zeroAmountCoins = await wallet.bootstrap(2);

		const mintQuote = await wallet.createMintQuote(2337, 'test');
		const meltQuote: MeltQuoteResponse = await wallet.createMeltQuote('lnbc20u1p3u27nppp5pm074ffk6m42lvae8c6847z7xuvhyknwgkk7pzdce47grf2ksqwsdpv2phhwetjv4jzqcneypqyc6t8dp6xu6twva2xjuzzda6qcqzpgxqyz5vqsp5sw6n7cztudpl5m5jv3z6dtqpt2zhd3q6dwgftey9qxv09w82rgjq9qyyssqhtfl8wv7scwp5flqvmgjjh20nf6utvv5daw5h43h69yqfwjch7wnra3cn94qkscgewa33wvfh7guz76rzsfg9pwlk8mqd27wavf2udsq3yeuju');
		await sleep(2000);

		const [zeroCoin, balanceCoin] = await wallet.kvacMint(zeroAmountCoins[0], zeroAmountCoins[1], 2337, mintQuote.quote);

		const [state, [_zeroCoin1, newBalanceCoin]] = await wallet.kvacMelt(meltQuote, balanceCoin, zeroCoin);

		expect(state).toBe(MeltQuoteState.PAID);
		console.log(`balance coin after melt: ${JSON.stringify(newBalanceCoin, null, 2)}`);
		expect(newBalanceCoin.amount).toBeLessThanOrEqual(2337-2000);
	});
	*/
});
