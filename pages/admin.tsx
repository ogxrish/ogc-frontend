import BasicButton from "@/components/BasicButton";
import { deposit, getGlobalAccountData, getProgramBalance, initialize, modifyGlobalData, newEpoch, ogcDecimals, withdraw } from "@/components/chain";
import StyledInput from "@/components/StyledInput";
import WalletButton from "@/components/WalletButton";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";



export default function Admin() {
    const { publicKey } = useWallet();
    const [initialized, setInitialized] = useState<boolean>(false);
    const [globalData, setGlobalData] = useState<any>();
    const [epochLength, setEpochLength] = useState<number>(0);
    const [epochLockTime, setEpochLockTime] = useState<number>(0);
    const [rewardAmount, setRewardAmount] = useState<number>(0);
    const [depositOgc, setDepositOgc] = useState<number>(0);
    const [withdrawOgc, setWithdrawOgc] = useState<number>(0);
    const [ogcBalance, setOgcBalance] = useState<bigint>(BigInt(0));
    const [solBalance, setSolBalance] = useState<number>(0);
    useEffect(() => {
        getGlobalAccountData().then((data) => {
            if (data) {
                setInitialized(true);
                setGlobalData({
                    epoch: data.epoch.toNumber(),
                    epochEndTime: new Date(data.epochEndTime.toNumber() * 1000),
                    epochLength: data.epochLength.toNumber(),
                    epochLockTime: data.epochLockTime.toNumber(),
                    rewardAmount: data.rewardAmount.div(new BN(10 ** ogcDecimals)).toNumber(),
                    feeLamports: data.feeLamports.toNumber(),
                });
                setRewardAmount(data.rewardAmount.div(new BN(10 ** ogcDecimals)).toNumber());
                setEpochLength(data.epochLength.toNumber());
                setEpochLockTime(data.epochLockTime.toNumber());
            }
        });
        getProgramBalance().then(({ ogcBalance, solBalance }) => {
            setOgcBalance(ogcBalance / (BigInt(10 ** ogcDecimals)));
            setSolBalance(solBalance / LAMPORTS_PER_SOL);
        });
    }, []);
    const onInitialize = async () => {
        if (!publicKey) return;
        const [tx1, tx2] = await initialize(publicKey);
        console.log({ tx1, tx2 });
    };
    const onModifyGlobalData = async () => {
        if (!publicKey) return;
        const tx = await modifyGlobalData(publicKey, epochLockTime, epochLength, rewardAmount * 10 ** ogcDecimals);
        console.log(tx);
    };
    const onNewEpoch = async () => {
        if (!publicKey || !globalData) return;
        const tx = await newEpoch(publicKey, globalData.epoch + 1);
        console.log(tx);
    };
    const onDeposit = async () => {
        if (!publicKey) return;
        const tx = await deposit(publicKey, depositOgc * 10 ** ogcDecimals);
        console.log(tx);
    };
    const onWithdraw = async () => {
        if (!publicKey) return;
        const tx = await withdraw(publicKey, withdrawOgc * 10 ** ogcDecimals);
        console.log(tx);
    };
    const onWithdrawSol = async () => {

    }

    return (
        <div className="w-full bg-black flex justify-center items-center">
        <div className="flex flex-col justify-start items-center gap-2 pt-10 w-[60%]">
            <WalletButton />
            <BasicButton onClick={onInitialize} text="Initialize" disabled={initialized} />
            <p>Global data</p>
            <p>Epoch: {globalData?.epoch}</p>
            <p>Epoch end time: {globalData?.epochEndTime.toString()}</p>
            <p>Epoch lock time: {globalData?.epochLockTime}</p>
            <p>Epoch length: {globalData?.epochLength}</p>
            <p>Reward Amount: {globalData?.rewardAmount}</p>
            <BasicButton onClick={onNewEpoch} text="New Epoch" />
            <div className="flex flex-row justify-center items-center gap-2">
                <div className="flex flex-col justify-center items-center gap-2">
                    <p>Epoch Length</p>
                    <StyledInput
                        placeholder="Epoch Length"
                        type="number"
                        value={epochLength}
                        onChange={(event: any) => setEpochLength(Number(event.target.value))}
                    />
                </div>
                <div className="flex flex-col justify-center items-center gap-2">
                    <p>Epoch Lock Time</p>
                    <StyledInput
                        placeholder="Epoch Lock Time"
                        type="number"
                        value={epochLockTime}
                        onChange={(event: any) => setEpochLockTime(Number(event.target.value))}
                    />
                </div>
                <div className="flex flex-col justify-center items-center gap-2">
                    <p>Reward Amount</p>
                    <StyledInput
                        placeholder="Reward Amount"
                        type="number"
                        value={rewardAmount}
                        onChange={(event: any) => setRewardAmount(Number(event.target.value))}
                    />
                </div>
            </div>
            <BasicButton onClick={onModifyGlobalData} text="Modify Global Data" />
            <p>OGC balance: {ogcBalance.toString()}</p>
            <div className="flex flex-row justify-center items-center gap-2">
                <StyledInput
                    placeholder="OGC to deposit"
                    type="number"
                    value={depositOgc}
                    onChange={(event: any) => setDepositOgc(Number(event.target.value))}
                />
                <BasicButton onClick={onDeposit} text="Deposit OGC" />
            </div>
            <div className="flex flex-row justify-center items-center gap-2">
                <StyledInput
                    placeholder="OGC to withdraw"
                    type="number"
                    value={withdrawOgc}
                    onChange={(event: any) => setWithdrawOgc(Number(event.target.value))}
                />
                <BasicButton onClick={onWithdraw} text="Withdraw OGC" />
            </div>
            <p>SOL Balance: {solBalance.toString()}</p>
            <BasicButton onClick={onWithdrawSol} text="Withdraw SOL" />
        </div>
        </div>
    );
}