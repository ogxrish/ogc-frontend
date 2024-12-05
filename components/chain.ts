import { AnchorProvider, BN, Instruction, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import idl from "./ogc_reserve.json";
import idl_broken from "./ogc_reserve_broken.json";
import { createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const ogcMint = new PublicKey(process.env.NEXT_PUBLIC_OGC_KEY!);
const oggMint = new PublicKey(process.env.NEXT_PUBLIC_OGG_KEY!);
export const ogcDecimals = process.env.NEXT_PUBLIC_RPC_URL?.includes("devnet") ? 6 : 7;
export const oggDecimals = process.env.NEXT_PUBLIC_RPC_URL?.includes("devnet") ? 6 : 9;
function getProvider() {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);
    const provider = new AnchorProvider(connection, (window as any).solana, AnchorProvider.defaultOptions());
    const program: any = new Program(idl as any, provider);
    return { connection, provider, program };
}
function getBrokenProvider() {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);
    const provider = new AnchorProvider(connection, (window as any).solana, AnchorProvider.defaultOptions());
    const program: any = new Program(idl_broken as any, provider);
    return { connection, provider, program };
}

export async function initialize(wallet: PublicKey) {
    const { program } = getProvider();

    const tx1 = await program.methods.initialize().accounts({
        signer: wallet,
        ogcMint,
        oggMint,
    }).rpc();
    const tx2 = await program.methods.initializeFirstEpochAccount().accounts({
        signer: wallet,
    }).rpc();
    return [tx1, tx2];
}
export async function newEpoch(wallet: PublicKey, epoch: number) {
    const { program } = getProvider();
    const prev = new BN(epoch - 1);
    const curr = new BN(epoch);
    const [prevEpochAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("epoch"), prev.toArrayLike(Buffer, "le", 8)],
        program.programId
    );
    const tx = await program.methods.newEpoch(curr).accounts({
        signer: wallet,
        prevEpochAccount
    }).rpc();
    return tx;
}
export async function modifyGlobalData(wallet: PublicKey, epochLockTime: number, epochLength: number, rewardPercent: number) {
    const { program } = getProvider();
    const tx = await program.methods.modifyGlobalData(new BN(epochLockTime), new BN(epochLength), new BN(rewardPercent)).accounts({
        signer: wallet,
    }).rpc();
    return tx;
}
export async function getReclaimable(wallet: PublicKey) {
    const { program } = getBrokenProvider();
    const [globalAccountAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("global")],
        program.programId
    );
    const globalAccount = await program.account.globalDataAccount.fetch(globalAccountAddress);
    const epochBN = new BN(globalAccount.epoch);
    console.log(epochBN.toString());
    try {
        let accounts = await program.account.lockAccount.all([
            {
                memcmp: {
                    offset: 24,
                    bytes: wallet.toBase58()
                }
            }
        ]);
        console.log(accounts);
        return {
            accounts,
            amount: accounts.reduce((prev: BN, curr: BN) => curr.account.amount.add(prev), new BN(0)),
            canClaim: true
        };
    } catch (e) {
        console.error(e);
        return {
            accounts: [],
            amount: new BN(0),
            canClaim: false
        };
    }
}
export async function reclaim(wallet: PublicKey) {
    const { program } = getBrokenProvider();
    const { accounts } = await getReclaimable(wallet);
    const signerTokenAccount = getAssociatedTokenAddressSync(oggMint, wallet);
    for (let i = 0; i < accounts.length; i++) {
        console.log(accounts[i]);
        const tx = await program.methods.unlock(accounts[i].account.epoch, accounts[i].account.amount).accounts({
            signer: wallet,
            signerTokenAccount,
        }).rpc();
        console.log(tx);
    }
    // finish later when i can test
}
export async function deposit(wallet: PublicKey, amount: BN) {
    const { program } = getProvider();
    const signerTokenAccount = getAssociatedTokenAddressSync(ogcMint, wallet);
    const tx = await program.methods.depositOgc(new BN(amount)).accounts({
        signer: wallet,
        signerTokenAccount,
    }).rpc();
    return tx;
}
export async function withdraw(wallet: PublicKey, amount: BN) {
    const { program } = getProvider();
    const signerTokenAccount = getAssociatedTokenAddressSync(ogcMint, wallet);
    const tx = await program.methods.withdrawOgc(new BN(amount)).accounts({
        signer: wallet,
        signerTokenAccount
    }).rpc();
    return tx;
}
export async function vote(wallet: PublicKey, epoch: number, votes: number[], signTransaction: any) {
    const { program, connection } = getProvider();
    const [voteAccountAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), wallet.toBuffer(), new BN(epoch).toArrayLike(Buffer, "le", 8)],
        program.programId
    );
    const voteAccount = await connection.getAccountInfo(voteAccountAddress);
    const voteBNs = votes.map((v) => new BN(v).mul(new BN(10 ** oggDecimals)));
    let tx;
    if (!voteAccount) {
        const i = await program.methods.createVoteAccount(new BN(epoch)).accounts({
            signer: wallet
        }).instruction();
        const i2 = await program.methods.vote(new BN(epoch), voteBNs).accounts({
            signer: wallet
        }).instruction();
        const transaction = new Transaction().add(i, i2);
        const blockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash.blockhash;
        transaction.feePayer = wallet;
        const signed = await signTransaction(transaction);
        tx = await connection.sendRawTransaction(signed.serialize());
    } else {
        tx = await program.methods.vote(new BN(epoch), voteBNs).accounts({
            signer: wallet
        }).rpc();
    }
    return tx;
}
export async function lock(wallet: PublicKey, epoch: number, amount: number, signTransaction: (t: any) => any) {
    const { program, connection } = getProvider();
    const transaction = new Transaction();
    const signerTokenAccount = getAssociatedTokenAddressSync(oggMint, wallet);
    const [userDataAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("data"), wallet.toBuffer()],
        program.programId
    );
    const [lockAccountAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("lock"), wallet.toBuffer(), new BN(epoch).toArrayLike(Buffer, "le", 8)],
        program.programId
    );
    const [statsAccountAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("stats"), wallet.toBuffer()],
        program.programId
    );
    const userData = await connection.getAccountInfo(userDataAddress);
    const lockAccount = await connection.getAccountInfo(lockAccountAddress);
    const statsAccount = await connection.getAccountInfo(statsAccountAddress);
    if (!userData) {
        const i = await program.methods.createDataAccount().accounts({
            signer: wallet,
            mint: oggMint
        }).transaction();
        transaction.add(i);
    }
    if (!lockAccount) {
        const i = await program.methods.createLockAccount(new BN(epoch)).accounts({
            signer: wallet
        }).transaction();
        transaction.add(i);
    }
    if (!statsAccount) {
        const i = await program.methods.createStatsAccount().accounts({
            signer: wallet
        }).transaction();
        transaction.add(i);
    }
    const i = await program.methods.lock(new BN(epoch), new BN(amount)).accounts({
        signer: wallet,
        signerTokenAccount
    }).transaction();
    transaction.add(i);
    const blockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.feePayer = wallet;
    const signed = await signTransaction(transaction);
    const tx = await connection.sendRawTransaction(signed.serialize());
    return tx;
}
export async function unlock(wallet: PublicKey, epoch: number, amount: number, signTransaction: (t: any) => any) {
    const { program, provider } = getProvider();
    let { accounts } = await getUnlockStatus(wallet, epoch);
    const signerTokenAccount = getAssociatedTokenAddressSync(oggMint, wallet);
    let instructions: TransactionInstruction[] = [];
    let amountBN = new BN(amount);
    let index = 0;
    while (amountBN.gte(new BN(0)) && index < accounts.length) {
        const min = amountBN.lt(accounts[index].account.amount) ? amountBN : accounts[index].account.amount;
        const ix = await program.methods.unlock(accounts[index].account.epoch, min).accounts({
            signer: wallet,
            signerTokenAccount,
        }).transaction();
        instructions.push(ix);
        amountBN = amountBN.sub(min);
        index++;
    }
    const sigs: string[] = [];
    console.log(instructions.length);
    for (let i = 0; i < instructions.length; i += 3) {
        const tx = new Transaction();
        for (let ii = i; i < i + 3 && i < instructions.length && instructions[ii]; ii++) {
            tx.add(instructions[ii]);
        }
        if (tx.instructions.length > 0) {
            const sig = await provider.sendAndConfirm(tx);
            sigs.push(sig);
        }
        // tx.feePayer = wallet;
        // const recentBlockhash = await connection.getLatestBlockhash();
        // tx.recentBlockhash = recentBlockhash.blockhash;
        // const signed = await signTransaction(tx);
        // const t = await connection.sendRawTransaction(signed.serialize());
        // const ti = await connection.confirmTransaction({
        //     blockhash: recentBlockhash
        // })
    }
    return sigs;
}
export async function claim(wallet: PublicKey, epoch: number) {
    const { program, provider, connection } = getProvider();
    const { epochs } = await getClaimable(wallet, epoch);
    const signerTokenAccount = getAssociatedTokenAddressSync(ogcMint, wallet);
    const info = await connection.getAccountInfo(signerTokenAccount);
    if (!info) {
        const ix = createAssociatedTokenAccountInstruction(
            wallet,
            signerTokenAccount,
            wallet,
            ogcMint
        );
        const transaction = new Transaction().add(ix);
        const tx = await provider.sendAndConfirm(transaction);
        console.log(tx);
    }
    const txs: string[] = [];
    for (let i = 0; i < epochs.length; i += 5) {
        const transaction = new Transaction();
        for (let ii = i; ii < i + 5 && ii < epochs.length; ii++) {
            const ix = await program.methods.claim(epochs[i + ii]).accounts({
                signer: wallet,
                signerTokenAccount,
            }).transaction();
            transaction.add(ix);
        }
        if (transaction.instructions.length > 0) {
            const tx = await provider.sendAndConfirm(transaction);
            txs.push(tx);
        }
    }
    return txs;
}

export async function getGlobalAccountData() {
    const { program } = getProvider();
    const [globalAccountAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("global")],
        program.programId
    );
    try {
        const data = await program.account.globalDataAccount.fetch(globalAccountAddress);
        return data;
    } catch (e) {
        return null;
    }
}
export async function getProgramBalance() {
    const { program, connection } = getProvider();
    const [programHolderAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("holder")],
        program.programId
    );
    const [programAuthorityAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("auth")],
        program.programId
    )
    try {
        const programHolderAccount = await getAccount(connection, programHolderAddress);
        const programAuthority = await connection.getAccountInfo(programAuthorityAddress);
        return {
            ogcBalance: programHolderAccount.amount,
            solBalance: programAuthority?.lamports || 0
        };
    } catch (e) {
        return {
            ogcBalance: BigInt(0),
            solBalance: 0
        };
    }
}
export function shortenAddress(address: string): string {
    if (!address) return "So11...1111";
    return `${address.substring(0, 4)}...${address.substring(address.length - 4, address.length)}`;
}
export async function getLockStatus(wallet: PublicKey) {
    const { program } = getProvider();
    const [userDataAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("data"), wallet.toBuffer()],
        program.programId
    );
    try {
        const userDataAccount = await program.account.userDataAccount.fetch(userDataAddress);
        return userDataAccount.amount;
    } catch (e) {
        return new BN(0);
    }
}
export async function getUnlockStatus(wallet: PublicKey, epoch: number) {
    const { program } = getProvider();
    const epochBN = new BN(epoch);
    try {
        let accounts = await program.account.lockAccount.all([
            {
                memcmp: {
                    offset: 24,
                    bytes: wallet.toBase58()
                }
            }
        ]);
        accounts = accounts.filter((account: any) => epochBN.gte(account.account.unlockEpoch));
        return {
            accounts,
            amount: accounts.reduce((prev: BN, curr: BN) => curr.account.amount.add(prev), new BN(0)),
        };
    } catch (e) {
        return {
            accounts: [],
            amount: new BN(0)
        };
    }
}
export async function getEpochVotes(epoch: number) {
    const { program } = getProvider();
    const epochBN = new BN(epoch);
    const [epochAccountAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("epoch"), epochBN.toArrayLike(Buffer, "le", 8)],
        program.programId
    );
    const epochAccount = await program.account.epochAccount.fetch(epochAccountAddress);
    return { epochVotes: epochAccount.fields, totalVotes: epochAccount.voters };
}
export function calculateVoteCost(n: BN, feeLamports: BN) {
   return n.pow(new BN(2)).mul(feeLamports)
}
export async function getMyVote(wallet: PublicKey, epoch: number) {
    const { program } = getProvider();
    const epochBN = new BN(epoch);
    const [voteAccountAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), wallet.toBuffer(), epochBN.toArrayLike(Buffer, "le", 8)],
        program.programId
    );
    try {
        const voteAccount = await program.account.voteAccount.fetch(voteAccountAddress);
        return voteAccount.fields;
    } catch (e) {
        return null;
    }
}
export async function getClaimable(wallet: PublicKey, epoch: number) {
    const { program } = getProvider();
    const epochBN = new BN(epoch);
    const voteAccounts = await program.account.voteAccount.all([
        {
            memcmp: {
                offset: 8,
                bytes: wallet.toBase58()
            }
        }
    ]);
    let reward = new BN(0);
    const epochs = [];
    for (const voteAccount of voteAccounts) {
        if (voteAccount.account.epoch.lt(epochBN)) {
            const [epochAccountAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("epoch"), voteAccount.account.epoch.toArrayLike(Buffer, "le", 8)],
                program.programId
            );
            const epochAccount = await program.account.epochAccount.fetch(epochAccountAddress);
            const winner = epochAccount.winner.toNumber();
            if (epochAccount.fields[winner].gt(new BN(0))) {
                const change = voteAccount.account.fields[winner].mul(epochAccount.reward).div(epochAccount.fields[winner]);
                reward = reward.add(change);
                epochs.push(voteAccount.account.epoch);
            }
        }
    }
    return {
        reward,
        epochs
    };
}
export function bnMax(...bns: BN[]) {
    if (bns.length === 0) throw new Error("Length 0");
    let max = bns[0]
    for (const bn of bns) {
        if (bn.gt(max)) {
            max = bn;
        }
    }
    //
    return max;
}
export function bnMin(...bns: BN[]) {
    if (bns.length === 0) throw new Error("Length 0");
    let min = bns[0];
    for (const bn of bns) {
        if (bn.lt(min)) {
            min = bn
        }
    }
    return min;
}
export async function jupQuote(from: string, to: string, amount: number) {
    try {
        const quoteResponse = await (
            await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${from}&outputMint=${to}&amount=${amount}&slippageBps=50`)
        ).json();
        return quoteResponse;
    } catch (e) {
        return { outAmount: 0 }
    }
}