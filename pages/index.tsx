import BasicButton from "@/components/BasicButton";
import { claim, getClaimable, getEpochVotes, getGlobalAccountData, getLockStatus, getMyVote, getUnlockStatus, lock, newEpoch, unlock, vote } from "@/components/chain";
import Countdown from "@/components/Countdown";
import PoolWidget from "@/components/PoolWidget";
import StyledInput from "@/components/StyledInput";
import TransactionFailure from "@/components/TransactionFailure";
import TransactionPending from "@/components/TransactionPending";
import TransactionSuccess from "@/components/TransactionSuccess";
import WalletButton from "@/components/WalletButton";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

const DEFAULT_MAX: number = 10000;
export default function Home() {
  const { publicKey, signTransaction } = useWallet();
  const [lockedOgg, setLockedOgg] = useState<BN>(new BN(0));
  const [availableOgg, setAvailableOgg] = useState<BN>(new BN(0));
  const [claimableOgc, setClaimableOgc] = useState<BN>(new BN(0));
  const [succeededTransaction, setSucceededTransaction] = useState<boolean>(false);
  const [failedTransaction, setFailedTransaction] = useState<boolean>(false);
  const [sendingTransaction, setSendingTransaction] = useState<boolean>(false);
  const [maxBalance, setMaxBalance] = useState<number>(DEFAULT_MAX);
  const [baseCount, setBaseCount] = useState<number[]>(Array.from({ length: 16 }).map(() => 0));
  const [voteCount, setVoteCount] = useState<number[]>(Array.from({ length: 16 }).map(() => 0));
  const [lockAmount, setLockAmount] = useState<number>(0);
  const [unlockableOgg, setUnlockableOgg] = useState<number>(0);
  const [unlockAmount, setUnlockAmount] = useState<number>(0);
  const [globalAccount, setGlobalAccount] = useState<any>();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [voted, setVoted] = useState<boolean>(false);
  useEffect(() => {
    getGlobalAccountData().then((data) => {
      const end = data.epochEndTime.toNumber() * 1000;
      setGlobalAccount({
        epoch: data.epoch.toNumber(),
        epochEndTime: new Date(end),
        epochLength: data.epochLength.toNumber(),
        epochLockTime: data.epochLockTime.toNumber(),
        rewardPercent: data.rewardPercent.toNumber()
      });
      setTimeLeft(end - Date.now());
    });
  }, []);
  useEffect(() => {
    if (!publicKey) return;
    getLockStatus(publicKey).then((locked) => {
      setAvailableOgg(locked);
      setLockedOgg(locked);
    });
  }, [publicKey]);
  useEffect(() => {
    if (publicKey && globalAccount) {
      getUnlockStatus(publicKey, globalAccount.epoch).then(({ amount }) => {
        setUnlockableOgg(amount.toString());
      });
      getMyVote(publicKey, globalAccount.epoch).then(async (fields) => {
        const epochVotes = await getEpochVotes(globalAccount.epoch);
        if (fields) {
          const baseCount = epochVotes.map((vote: BN, i: number) => {
            return vote.sub(fields[i]);
          });
          setBaseCount(baseCount.map((b: BN) => b.toNumber()));
          setVoteCount(fields.map((b: BN) => b.toNumber()));
          setVoted(true);
        } else {
          setBaseCount(epochVotes.map((b: BN) => b.toNumber()));
        }
      });
      getClaimable(publicKey, globalAccount.epoch).then(({ reward }) => {
        setClaimableOgc(reward);
      });
    }
  }, [publicKey, globalAccount]);
  const onChangeAddAmount = (i: number, amount: number) => {
    const newValue = availableOgg.sub(new BN(amount));
    if (newValue.gte(new BN(0))) {
      setAvailableOgg(newValue);
      setVoteCount(voteCount => voteCount.map((v, ii) => ii === i ? Math.max(v + amount, 0) : v));
    }
  };
  const onClaim = async () => {
    if (!publicKey || !globalAccount) return;
    try {
      setSendingTransaction(true);
      // claim logic here
      const txs = await claim(publicKey, globalAccount.epoch);
      console.log(txs);
      setSucceededTransaction(true);
    } catch (e) {
      console.error(e);
      setFailedTransaction(true);
    } finally {
      setSendingTransaction(false);
      setTimeout(() => {
        setFailedTransaction(false);
        setSucceededTransaction(false);
      }, 5000);
    }
  };
  const onVote = async () => {
    if (!publicKey || !globalAccount) return;
    try {
      setSendingTransaction(true);
      const tx = await vote(publicKey, globalAccount.epoch, voteCount);
      console.log(tx);
      setSucceededTransaction(true);
    } catch (e) {
      console.error(e);
      setFailedTransaction(true);
    } finally {
      setSendingTransaction(false);
      setTimeout(() => {
        setFailedTransaction(false);
        setSucceededTransaction(false);
      }, 5000);
    }
  };
  const onLock = async () => {
    if (!publicKey || !signTransaction || !globalAccount) return;
    try {
      setSendingTransaction(true);
      const tx = await lock(publicKey, globalAccount.epoch, lockAmount, signTransaction);
      console.log(tx);
      setSucceededTransaction(true);
    } catch (e) {
      console.error(e);
      setFailedTransaction(true);
    } finally {
      setSendingTransaction(false);
      setTimeout(() => {
        setFailedTransaction(false);
        setSucceededTransaction(false);
      }, 5000);
    }
  };
  const onUnlock = async () => {
    if (!publicKey || !signTransaction || !globalAccount) return;
    try {
      setSendingTransaction(true);
      const txs = await unlock(publicKey, globalAccount.epoch, unlockAmount, signTransaction);
      console.log(txs);
      setSucceededTransaction(true);
    } catch (e) {
      console.error(e);
      setFailedTransaction(true);
    } finally {
      setSendingTransaction(false);
      setTimeout(() => {
        setFailedTransaction(false);
        setSucceededTransaction(false);
      }, 5000);
    }
  };
  const onNewEpoch = async () => {
    if (!publicKey || !globalAccount) return;
    try {
      setSendingTransaction(true);
      const tx = await newEpoch(publicKey, globalAccount.epoch);
      console.log(tx);
      setSucceededTransaction(true);
    } catch (e) {
      console.error(e);
      setFailedTransaction(true);
    } finally {
      setSendingTransaction(false);
      setTimeout(() => {
        setFailedTransaction(false);
        setSucceededTransaction(false);
      }, 5000);
    }
  };
  return (
    <div className="flex flex-col justify-start items-center w-full h-full">
      {succeededTransaction &&
        <div className="fixed bottom-0 right-0 mr-6 mb-6">
          <TransactionSuccess />
        </div>
      }
      {failedTransaction &&
        <div className="fixed bottom-0 right-0 mr-6 mb-6">
          <TransactionFailure />
        </div>
      }
      {sendingTransaction &&
        <div className="fixed bottom-0 right-0 mr-6 mb-6">
          <TransactionPending />
        </div>
      }
      <p className="text-4xl">OGC Reserve</p>
      <WalletButton />
      <p>Your locked OGG: {lockedOgg.toString()}</p>
      <div className="flex flex-row justify-center items-center gap-2">
        <StyledInput
          placeholder="To lock"
          value={lockAmount}
          onChange={(event: any) => setLockAmount(Number(event.target.value))}
          type="number"
        />
        <BasicButton onClick={onLock} text="Lock" disabled={lockAmount <= 0} />
      </div>
      <p>Your unlockable OGG: {unlockableOgg}</p>
      <div className="flex flex-row justify-center items-center gap-2">
        <StyledInput
          placeholder="To unlock"
          value={unlockAmount}
          onChange={(event: any) => setUnlockAmount(Number(event.target.value))}
          type="number"
        />
        <BasicButton onClick={onUnlock} text="Unlock" disabled={unlockAmount <= 0} />
      </div>
      <div className="flex flex-col justify-center items-center gap-4">
        <p className={`${voted ? "opacity-30" : ""}`}>Available OGG: {availableOgg.toString()}</p>
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: 16 }).map((_, i) =>
            <div key={i}>
              <PoolWidget
                title={`Pool ${i}`}
                percent={baseCount[i] / maxBalance * 100}
                added={voteCount[i] / maxBalance * 100}
                addAmount={voteCount[i]}
                onChangeAddAmount={(n: number) => onChangeAddAmount(i, n)}
                addDisabled={voted || availableOgg <= 0}
                subtractDisabled={voted || voteCount[i] === 0}
              />
            </div>
          )}
        </div>
        <div>
          {/* {timeLeft <= 0 ?
            <BasicButton text="New Epoch" onClick={onNewEpoch} />
            :
            <BasicButton text="Vote" onClick={onVote} disabled={voted || !voteCount.find(v => v != 0)} disabledText={voted ? "You have already voted" : "No stake allocated"} />
          } */}
          <BasicButton text="Vote" onClick={onVote} disabled={voted || !voteCount.find(v => v != 0)} disabledText={voted ? "You have already voted" : "No stake allocated"} />
        </div>
        <Countdown timeLeft={timeLeft} />
        <p>Claimable OGC: {claimableOgc.toString()}</p>
        <BasicButton onClick={onClaim} text="Claim" disabled={claimableOgc.eq(new BN(0))} disabledText="No OGC to claim" />
      </div>
    </div>
  );
}
