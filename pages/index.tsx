import BasicButton from "@/components/BasicButton";
import BigText from "@/components/BigText";
import { calculateVoteCost, claim, getClaimable, getEpochVotes, getGlobalAccountData, getLockStatus, getMyVote, getProgramBalance, getUnlockStatus, lock, newEpoch, ogcDecimals, oggDecimals, unlock, vote } from "@/components/chain";
import Chart from "@/components/Chart";
import Countdown from "@/components/Countdown";
import LeaderboardRow from "@/components/LeaderboardRow";
import LoadedText from "@/components/LoadedText";
import PoolWidget from "@/components/PoolWidget";
import StyledInput from "@/components/StyledInput";
import TransactionFailure from "@/components/TransactionFailure";
import TransactionPending from "@/components/TransactionPending";
import TransactionSuccess from "@/components/TransactionSuccess";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const DEFAULT_MAX: number = 10000;
const names: string[] = ["Alpha", "Beta", "Gamma", "Delta"];
type ViewState = "INFO" | "LOCK" | "STAKE" | "CLAIM" | "STATS";
export default function Home() {
  const { publicKey, signTransaction } = useWallet();
  const [state, setState] = useState<ViewState>("INFO");
  const [lockedOgg, setLockedOgg] = useState<BN>(new BN(0));
  const [availableOgg, setAvailableOgg] = useState<BN>(new BN(0));
  const [claimableOgc, setClaimableOgc] = useState<BN>(new BN(0));
  const [succeededTransaction, setSucceededTransaction] = useState<boolean>(false);
  const [failedTransaction, setFailedTransaction] = useState<boolean>(false);
  const [sendingTransaction, setSendingTransaction] = useState<boolean>(false);
  const [maxBalance, setMaxBalance] = useState<number>(DEFAULT_MAX);
  const [baseCount, setBaseCount] = useState<number[]>(Array.from({ length: 4 }).map(() => 0));
  const [voteCount, setVoteCount] = useState<number[]>(Array.from({ length: 4 }).map(() => 0));
  const [voteCost, setVoteCost] = useState<BN>(new BN(0));
  const [myVote, setMyVote] = useState<number[]>(Array.from({length: 4}).map(() => 0));
  const [voteAmount, setVoteAmount] = useState<BN>(new BN(0));
  const [lockAmount, setLockAmount] = useState<number>(0);
  const [unlockableOgg, setUnlockableOgg] = useState<number>(0);
  const [unlockAmount, setUnlockAmount] = useState<number>(0);
  const [globalAccount, setGlobalAccount] = useState<any>();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [ogcReward, setOgcReward] = useState<BN>();
  const [totalUnlockableOgg, setTotalUnlockableOgg] = useState<string>();
  const [totalLockedOgg, setTotalLockedOgg] = useState<string>();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>();
  const router = useRouter();
  useEffect(() => {
    if (router && router.isReady) {
      const { state } = router.query;
      setState(state as ViewState || "INFO");
    }
  }, [router, router.isReady]);
  useEffect(() => {
    if (!router || !router.isReady) return;
    const newQuery = { ...router.query, state };
    router.push({
      pathname: router.pathname,  // Keep the same pathname
      query: newQuery,            // Update the query parameters
    });
  }, [state]);
  useEffect(() => {
    (async () => {
      return;
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ogc-data`);
      const json = await response.json();
      console.log(json);
      setTotalLockedOgg(json.totalLocked);
      setTotalUnlockableOgg(json.totalUnlockable);
      setLeaderboard(json.leaderboard);
      setChartData(json.incremental.map((i: any) => {
        return {
          id: Number(i.id),
          dailyReward: new BN(json.dailyOgcReward).div(new BN(10 ** ogcDecimals)).toNumber(),
          totalReserve: new BN(json.totalReserve).div(new BN(10 ** ogcDecimals)).toNumber(),
          totalReservers: Number(json.totalReservers),
          unlockableOgg: new BN(json.unlockableOgg).div(new BN(10 * oggDecimals)).toNumber(),
          lockedOgg: new BN(json.lockedOgg).div(new BN(10 * oggDecimals)).toNumber(),
        }
      }))
    })();
  }, []);
  useEffect(() => {
    getGlobalAccountData().then(async (data) => {
      const end = data.epochEndTime.toNumber();
      const { ogcBalance } = await getProgramBalance();
      setGlobalAccount({
        epoch: data.epoch.toNumber(),
        epochEndTime: new Date(end * 1000),
        epochLength: data.epochLength.toNumber(),
        epochLockTime: data.epochLockTime.toNumber(),
        rewardPercent: data.rewardPercent.toNumber(),
        feeLamports: data.feeLamports
      });
      setTimeLeft(end - Date.now() / 1000);
      setOgcReward(new BN(ogcBalance.toString()).mul(data.rewardPercent).div(new BN(100)));
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
        const { epochVotes, totalVotes } = await getEpochVotes(globalAccount.epoch);
        const cost = calculateVoteCost(totalVotes, globalAccount.feeLamports);
        setVoteCost(cost);
        if (fields) {
          let voteAmount = new BN(0)
          const baseCount = epochVotes.map((vote: BN, i: number) => {
            voteAmount = voteAmount.add(vote);
            return vote.sub(fields[i]);
          });
          setBaseCount(baseCount.map((b: BN) => b.toNumber()));
          setMyVote(fields.map((b: BN) => b.toNumber()));
          setVoteAmount(voteAmount)
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
      setClaimableOgc(new BN(0));
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
      const tx = await vote(publicKey, globalAccount.epoch, voteCount, signTransaction);
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
      const tx = await newEpoch(publicKey, globalAccount.epoch + 1);
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
      <div className="mt-4 flex flex-col h-[80vh] justify-center w-[95%] md:w-[75%] lg:w-[60%] gap-2">
        <div className="flex flex-row justify-center items-center gap-2">
          <BasicButton onClick={() => setState("INFO")} text="Info" disabled={state === "INFO"} />
          <BasicButton onClick={() => setState("LOCK")} text="Lock" disabled={state === "LOCK"} />
          <BasicButton onClick={() => setState("STAKE")} text="Reserve" disabled={state === "STAKE"} />
          <BasicButton onClick={() => setState("CLAIM")} text="Claim" disabled={state === "CLAIM"} />
          <BasicButton onClick={() => setState("STATS")} text="Stats" disabled={state === "STATS"} />
        </div>

        <div className="flex flex-col gap-2 justify-start overflow-y-auto items-center h-full w-full border-white border-2 rounded-lg p-4 bg-black">
          <div className="flex flex-col justify-start items-center overflow-y-auto w-full h-full">
            {state === "INFO" ?
              <div className="flex flex-col justify-between items-center text-center w-full h-full">
                <p>Welcome to the OG Reserve. The reserve <ImportantSpan>distributes $OGC</ImportantSpan>, the common value of the Realm of OGs.</p>
                <p><ImportantSpan>70% (700B)</ImportantSpan> of $OGC is forever allocated to the reserve</p>
                <p>Distributions equal <ImportantSpan>1M $OGC</ImportantSpan> to a random reserve slot each epoch. Epochs last for 24 hours beginning at 00:00 UTC.</p>
                <p>Wallets can add Reserves to any reserve slot each epoch for any amount of $OGG. Reserve cost <ImportantSpan>increases</ImportantSpan> with each new reserve during an epoch. Difficulty <ImportantSpan>resets</ImportantSpan> each epoch. $OGG reserves are locked to reserve slots for 100 epochs. Reserves are distributed their proportion of $OGC while locked.</p>
                <p>Reserve fees are currently <ImportantSpan>paid in $SOL</ImportantSpan>. $OGG and $OGC will soon be allowed.</p>
                <p><ImportantSpan>100% of reserve fees</ImportantSpan> collected go towards repurchasing $OGC from the open market to replenish the reserve. $OGC distributed but unclaimed after 10 epochs is <ImportantSpan>returned to the reserve</ImportantSpan>.</p>
                <p><ImportantSpan>Those with $OGC liquidity will ascend in the Realm of OGs</ImportantSpan></p>
              </div>
              :
              state === "LOCK" ?
                <div className="flex flex-col justify-center gap-10 items-center w-full h-full">
                  <LoadedText start="Total Locked $OGG" value={totalLockedOgg} />
                  <LoadedText start="Total Unlockable $OGG" value={totalUnlockableOgg} />
                  <div className="flex flex-row justify-center items-center w-full gap-10">
                    <div>
                      <BigText text="Locked $OGG" number={lockedOgg.toString()} />
                      <div className="flex flex-row justify-center items-center gap-2 mt-2">
                        <StyledInput
                          placeholder="To lock"
                          value={lockAmount}
                          onChange={(event: any) => setLockAmount(Number(event.target.value))}
                          type="number"
                        />
                        <BasicButton onClick={onLock} text="Lock" disabled={lockAmount <= 0} />
                      </div>
                    </div>
                    <div>
                      <BigText text="Unlockable $OGG" number={unlockableOgg.toString()} />
                      <div className="flex flex-row justify-center items-center gap-2 mt-2">
                        <StyledInput
                          placeholder="To unlock"
                          value={unlockAmount}
                          onChange={(event: any) => setUnlockAmount(Number(event.target.value))}
                          type="number"
                        />
                        <BasicButton onClick={onUnlock} text="Unlock" disabled={unlockAmount <= 0} />
                      </div>
                    </div>
                  </div>
                </div>
                :
                state === "STAKE" ?
                  <>
                    <div className="flex flex-col justify-center items-center gap-4">
                      <LoadedText start="Your available (locked) $OGG" value={availableOgg.sub(voteAmount).toString()} />
                      <LoadedText start="$SOL Vote Cost" value={voteCost?.toString()} />
                      <LoadedText start="$OGC Epoch Reward" value={ogcReward?.toString()} />
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 4 }).map((_, i) =>
                          <div key={i}>
                            <PoolWidget
                              title={names[i]}
                              percent={baseCount[i] / maxBalance * 100}
                              voted={myVote[i] / maxBalance * 100}
                              added={voteCount[i] / maxBalance * 100}
                              addAmount={voteCount[i]}
                              onChangeAddAmount={(n: number) => onChangeAddAmount(i, n)}
                              addDisabled={availableOgg.sub(voteAmount).eq(new BN(0)) || availableOgg <= 0}
                              subtractDisabled={voteCount[i] === 0}
                            />
                          </div>
                        )}
                      </div>
                      {timeLeft < 0 ?
                        <BasicButton text="New Epoch" onClick={onNewEpoch} />
                        :
                        <BasicButton text="Vote" onClick={onVote} disabled={availableOgg.sub(voteAmount).eq(new BN(0))} disabledText={availableOgg.sub(voteAmount).eq(new BN(0)) ? "You have reserved all your $OGG" : "No Reserve allocated"} />
                      }
                    </div>
                  </>
                  :
                  state === "CLAIM" ?
                    <div className="flex flex-col justify-center items-center w-[50%] h-full gap-10">
                      <BigText text="Claimable $OGC" number={claimableOgc.toString()} />
                      <BasicButton onClick={onClaim} text="Claim" disabled={claimableOgc.eq(new BN(0))} disabledText="No OGC to claim" />
                    </div>
                    :
                    <div className="flex flex-col justify-center items-center">
                      <Chart data={chartData} />
                      <div className="flex flex-col justify-center items-center">
                        <div className="grid grid-cols-3 w-full">
                          <p>Wallet</p>
                          <p>$OGC Claimed</p>
                          <p>Epochs Participated In</p>
                        </div>
                        {leaderboard.map((row, i) => (
                          <div className="w-full" key={i}>
                            <LeaderboardRow row={row} />
                          </div>
                        ))}
                      </div>
                    </div>
            }
          </div>
          <div className="flex flex-col justify-center items-center">
            <p>Epoch 0x{globalAccount?.epoch.toString(16)}</p>
            <Countdown timeLeft={timeLeft} />
          </div>
        </div>
      </div>
    </div >
  );
}

function ImportantSpan({ children }: { children: React.ReactNode; }) {
  return (
    <span className="text-white font-bold">
      {children}
    </span>
  );
}