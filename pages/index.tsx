import BasicButton from "@/components/BasicButton";
import BigText from "@/components/BigText";
import { bnMax, calculateVoteCost, claim, getClaimable, getEpochVotes, getGlobalAccountData, getLockStatus, getMyVote, getOggBalance, getProgramBalance, getReclaimable, getUnlockStatus, jupQuote, lock, newEpoch, ogcDecimals, oggDecimals, reclaim, unlock, vote } from "@/components/chain";
import Chart from "@/components/Chart";
import Countdown from "@/components/Countdown";
import LeaderboardRow from "@/components/LeaderboardRow";
import LoadedText from "@/components/LoadedText";
import PoolWidget from "@/components/PoolWidget";
import StyledInput from "@/components/StyledInput";
import Toggle from "@/components/Toggle";
import TransactionFailure from "@/components/TransactionFailure";
import TransactionPending from "@/components/TransactionPending";
import TransactionSuccess from "@/components/TransactionSuccess";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
//
const DEFAULT_MAX: number = new BN(10000);
const HUNDRED: BN = new BN(100)
const names: string[] = ["Alpha", "Beta", "Gamma", "Delta"];
type ViewState = "INFO" | "LOCK" | "RESERVE" | "CLAIM" | "STATS";
export default function Home() {
  const { publicKey, signTransaction } = useWallet();
  const [state, setState] = useState<ViewState>("INFO");
  const [lockedOgg, setLockedOgg] = useState<BN>(new BN(0));
  const [availableOgg, setAvailableOgg] = useState<BN>(new BN(0));
  const [claimableOgc, setClaimableOgc] = useState<BN>(new BN(0));
  const [succeededTransaction, setSucceededTransaction] = useState<boolean>(false);
  const [failedTransaction, setFailedTransaction] = useState<boolean>(false);
  const [sendingTransaction, setSendingTransaction] = useState<boolean>(false);
  const [maxBalance, setMaxBalance] = useState<BN>(DEFAULT_MAX);
  const [baseCount, setBaseCount] = useState<BN[]>(Array.from({ length: 4 }).map(() => new BN(0)));
  const [voteCount, setVoteCount] = useState<BN[]>(Array.from({ length: 4 }).map(() => new BN(0)));
  const [voteCost, setVoteCost] = useState<BN>(new BN(0));
  const [myVote, setMyVote] = useState<BN[]>(Array.from({ length: 4 }).map(() => new BN(0)));
  const [voteAmount, setVoteAmount] = useState<BN>(new BN(0));
  const [lockAmount, setLockAmount] = useState<number>(0);
  const [unlockableOgg, setUnlockableOgg] = useState<BN>(new BN(0));
  const [unlockAmount, setUnlockAmount] = useState<number>(0);
  const [globalAccount, setGlobalAccount] = useState<any>();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [ogcReward, setOgcReward] = useState<BN>();
  const [voteCostUSD, setVoteCostUSD] = useState<string>();
  const [voteRewardUSD, setVoteRewardUSD] = useState<string>();
  const [totalUnlockableOgg, setTotalUnlockableOgg] = useState<string>();
  const [totalUnlockableOggUsd, setTotalUnlockableOggUsd] = useState<string>();
  const [totalLockedOgg, setTotalLockedOgg] = useState<string>();
  const [totalLockedOggUsd, setTotalLockedOggUsd] = useState<string>();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>();
  const [oggBalance, setOggBalance] = useState<bigint>(BigInt(0));
  const [totalVotes, setTotalVotes] = useState<BN>();
  const [usingOgc, setUsingOgc] = useState<boolean>(false);
  const [lastWinningReserves, setLastWinningReserves] = useState<number[]>([]);
  // const [reclaimableOgg, setReclaimableOgg] = useState<BN>(new BN(0));
  // const [canClaim, setCanClaim] = useState<boolean>(false);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ogc-data`);
      const json = await response.json();
      setLastWinningReserves(json.lastWinningReserves || []);
      const totalLockedOgg = new BN(json.totalLocked).div(new BN(10 ** oggDecimals)).toString();
      const oggQuote1 = await jupQuote("5gJg5ci3T7Kn5DLW4AQButdacHJtvADp7jJfNsLbRc1k", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", totalLockedOgg);
      setTotalLockedOgg(totalLockedOgg);
      const totalUnlockableOgg = new BN(json.totalUnlockable).div(new BN(10 ** oggDecimals)).toString();
      const oggQuote2 = await jupQuote("5gJg5ci3T7Kn5DLW4AQButdacHJtvADp7jJfNsLbRc1k", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", totalUnlockableOgg);
      setTotalLockedOggUsd((oggQuote1.outAmount / 10 ** 6).toFixed(2));
      setTotalUnlockableOggUsd((oggQuote2.outAmount / 10 ** 6).toFixed(2));
      setTotalUnlockableOgg(totalUnlockableOgg);
      setLeaderboard(json.leaderboard);
      setChartData(json.incremental.map((i: any) => {
        return {
          id: Number(i.id),
          dailyReward: new BN(i.dailyOgcReward).div(new BN(10 ** ogcDecimals)).toNumber(),
          totalReserve: new BN(i.totalReserve).div(new BN(10 ** ogcDecimals)).toNumber(),
          totalReservers: Number(i.totalReservers),
          unlockableOgg: new BN(i.unlockableOgg).div(new BN(10 * oggDecimals)).toNumber(),
          lockedOgg: new BN(i.lockedOgg).div(new BN(10 * oggDecimals)).toNumber(),
        }
      }))
    })();
  }, []);
  useEffect(() => {
    getGlobalAccountData().then(async (data) => {
      const end = data.epochEndTime.toNumber();
      // const { ogcBalance } = await getProgramBalance();
      setGlobalAccount({
        epoch: data.epoch.toNumber(),
        epochEndTime: new Date(end * 1000),
        epochLength: data.epochLength.toNumber(),
        epochLockTime: data.epochLockTime.toNumber(),
        rewardAmount: data.rewardAmount.toNumber(),
        feeLamports: data.feeLamports
      });
      setTimeLeft(end - Date.now() / 1000);
    });
  }, []);
  useEffect(() => { //
    if (!publicKey) return;
    getLockStatus(publicKey).then((locked) => {
      const oggFactor = new BN(10 ** oggDecimals)
      setAvailableOgg(locked.div(oggFactor));
      setLockedOgg(locked);
    });
    getOggBalance(publicKey).then((amount) => {
      setOggBalance(amount);
    })
    // getReclaimable(publicKey).then(({ amount, canClaim }) => {
    //   setReclaimableOgg(amount)
    //   setCanClaim(canClaim)
    // })
  }, [publicKey]);
  useEffect(() => {
    if (publicKey && globalAccount) {
      getUnlockStatus(publicKey, globalAccount.epoch).then(({ amount }) => {
        setUnlockableOgg(amount);
      });
      getMyVote(publicKey, globalAccount.epoch).then(async (fields) => {
        let { epochVotes, totalVotes } = await getEpochVotes(globalAccount.epoch);

        const oggFactor = new BN(10 ** oggDecimals)
        const summedVotes = bnMax(...epochVotes).div(oggFactor);
        setMaxBalance(bnMax(summedVotes, DEFAULT_MAX).mul(new BN(4)))
        const cost = calculateVoteCost(totalVotes, globalAccount.feeLamports).toNumber() / LAMPORTS_PER_SOL;
        const solQuote = await jupQuote("So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", cost * LAMPORTS_PER_SOL);
        setVoteCostUSD((solQuote.outAmount / 10 ** 6).toFixed(2))
        const ogcQuote = await jupQuote("DH5JRsRyu3RJnxXYBiZUJcwQ9Fkb562ebwUsufpZhy45", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", globalAccount.rewardAmount / totalVotes.toNumber());
        setVoteRewardUSD((ogcQuote.outAmount / 10 ** 6).toFixed(2));
        setTotalVotes(totalVotes);
        if (totalVotes.eq(new BN(0))) {
          setOgcReward(new BN(globalAccount.rewardAmount));
        } else {
          setOgcReward(new BN(globalAccount.rewardAmount).div(totalVotes));
        }
        setVoteCost(cost);
        if (fields) {
          let voteAmount = new BN(0)
          for (const field of fields) {
            voteAmount = voteAmount.add(field);
          }
          const baseCount = epochVotes.map((vote: BN, i: number) => {
            return vote.sub(fields[i]);
          });
          // console.log(baseCount.map(b => b.toString()));
          setBaseCount(baseCount.map((b: BN) => b.div(oggFactor)));
          setMyVote(fields.map((b: BN) => b.div(oggFactor)));
          setVoteAmount(voteAmount.div(oggFactor))
        } else {
          // (epochVotes.map((b: BN) => b.div(oggFactor)));
          setBaseCount(epochVotes.map((b: BN) => b.div(oggFactor)));
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
      setVoteCount(voteCount => voteCount.map((v, ii) => {
        const n = v.add(new BN(amount));
        if (n.gt(maxBalance)) {
          setMaxBalance(n);
        }
        if (ii === i) {
          return bnMax(n, new BN(0));
        } else {
          return v;
        }
      }));
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
      const votingCost = calculateVoteCost(totalVotes, globalAccount.feeLamports).toNumber();
      let quote: any = undefined;
      if (usingOgc) {
        quote = await jupQuote("So11111111111111111111111111111111111111112", "DH5JRsRyu3RJnxXYBiZUJcwQ9Fkb562ebwUsufpZhy45", votingCost);
      }
      const tx = await vote(publicKey, globalAccount.epoch, voteCount, signTransaction, usingOgc, quote?.outAmount);
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
      const tx = await lock(publicKey, globalAccount.epoch, lockAmount * 10 ** oggDecimals, signTransaction);
      setLockedOgg((lockedOgg: any) => lockedOgg.add(new BN(lockAmount)))
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
      console.log(globalAccount.epoch.toString());
      const txs = await unlock(publicKey, globalAccount.epoch, unlockAmount * 10 ** oggDecimals, signTransaction);
      setUnlockableOgg((unlockableOgg: any) => unlockableOgg.sub(new BN(unlockAmount)));
      setLockedOgg((lockedOgg: any) => lockedOgg.sub(new BN(unlockAmount)));
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
  const onReclaim = async () => {
    if (!publicKey) return;
    try {
      setSendingTransaction(true);
      await reclaim(publicKey);
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
  }
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
          <BasicButton onClick={() => setState("RESERVE")} text="Reserve" disabled={state === "RESERVE"} />
          <BasicButton onClick={() => setState("CLAIM")} text="Claim" disabled={state === "CLAIM"} />
          <BasicButton onClick={() => setState("STATS")} text="Stats" disabled={state === "STATS"} />
        </div>

        <div className="flex flex-col gap-2 justify-start overflow-y-auto items-center h-full w-full border-white border-2 rounded-lg p-4 bg-black">
          <div className="flex flex-col justify-start items-center overflow-y-auto w-full h-full">
            <p className="uppercase text-2xl lg:text-4xl font-extrabold mb-2">{state}</p>
            {state === "INFO" ?
              <div className="flex flex-col justify-between items-center text-center w-full h-full">
                <p>Welcome to the OG Reserve. The reserve <ImportantSpan>distributes $OGC</ImportantSpan>, the common value of the Realm of OGs.</p>
                <p><ImportantSpan>70% (700B)</ImportantSpan> of $OGC is forever allocated to the reserve</p>
                <p>Distributions equal <ImportantSpan>274M $OGC</ImportantSpan> to the 2nd largest reserve slot each epoch. Epochs last for 24 hours beginning at 00:00 UTC.</p>
                <p>$OGC is locked in the reserve for <ImportantSpan>100 epochs</ImportantSpan>. Wallets can add Reserves to any reserve slot each epoch for any amount of $OGG. Reserve cost <ImportantSpan>increases</ImportantSpan> with each new reserve during an epoch. Difficulty <ImportantSpan>resets</ImportantSpan> each epoch. $OGG reserves are locked to reserve slots for 100 epochs. Reserves are distributed their proportion of $OGC while locked.</p>
                <p>Reserve fees are currently <ImportantSpan>paid in $SOL</ImportantSpan>. $OGG and $OGC will soon be allowed.</p>
                <p><ImportantSpan>100% of reserve fees</ImportantSpan> collected go towards repurchasing $OGC from the open market to replenish the reserve. $OGC distributed but unclaimed after 10 epochs is <ImportantSpan>returned to the reserve</ImportantSpan>.</p>
                <p><ImportantSpan>Those with $OGC liquidity will ascend in the Realm of OGs</ImportantSpan></p>
              </div>
              :
              state === "LOCK" ?
                <div className="flex flex-col justify-center gap-10 items-center w-full h-full">
                  <LoadedText start="Total Locked $OGG" value={totalLockedOgg && totalLockedOggUsd ? `${totalLockedOgg} | $${totalLockedOggUsd}` : undefined} />
                  <LoadedText start="Total Unlockable $OGG" value={totalUnlockableOgg && totalUnlockableOggUsd ? `${totalUnlockableOgg} | $${Number.isNaN(Number(totalUnlockableOggUsd)) ? "0.00" : totalUnlockableOggUsd}` : undefined} />
                  <LoadedText start="Your Available $OGG" value={oggBalance} />
                  <div className="flex flex-row justify-center items-center w-full gap-10 overflow-x-auto">
                    {/* <div className="flex flex-col justify-center items-center gap-2">
                    <BigText text="Reclaimable $OGG" number={reclaimableOgg.div(new BN(10 ** oggDecimals)).toString()} />
                    <BasicButton onClick={onReclaim} text="Reclaim" disabled={!canClaim} disabledText="Reclaim opens soon" />
                  </div> */}
                    <div>
                      <BigText text="Locked $OGG" number={lockedOgg.div(new BN(10 ** oggDecimals)).toString()} />
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
                      <BigText text="Unlockable $OGG" number={unlockableOgg.div(new BN(10 ** oggDecimals)).toString()} />
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
                state === "RESERVE" ?
                  <>
                    <div className="flex flex-col justify-center items-center gap-4">
                      <LoadedText start="Number of Reservers" value={totalVotes !== undefined ? `${totalVotes.toNumber()}` : undefined} />
                      <LoadedText start="Last Winning Reserve" value={lastWinningReserves.length > 0 ? lastWinningReserves[0] : 0} />
                      <LoadedText start="Epoch Reward" value={274000000} />
                      <LoadedText start="Reserve Reward" value={ogcReward !== undefined ? `${ogcReward.div(new BN(10 ** ogcDecimals)).toString()} $OGC | ${Number.isNaN(voteRewardUSD) ? 0 : voteRewardUSD} $USDC` : ""} />
                      <LoadedText start="Reserve Cost" value={voteCost !== undefined ? `${voteCost.toString()} $SOL | ${Number.isNaN(Number(voteCostUSD)) ? Number(0).toFixed(2) : voteCostUSD} $USDC` : ""} />
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 4 }).map((_, i) =>
                          <div key={i}>
                            <PoolWidget
                              title={names[i]}
                              percent={baseCount[i].mul(HUNDRED).div(maxBalance).toNumber()}
                              voted={myVote[i].mul(HUNDRED).div(maxBalance).toNumber()}
                              myTotal={myVote[i].toNumber()}
                              added={voteCount[i].mul(HUNDRED).div(maxBalance).toNumber()}
                              total={baseCount[i].add(voteCount[i]).add(myVote[i])}
                              addAmount={voteCount[i].toNumber()}
                              onChangeAddAmount={(n: number) => onChangeAddAmount(i, n)}
                              addDisabled={availableOgg.sub(voteAmount).eq(new BN(0)) || availableOgg <= 0}
                              subtractDisabled={voteCount[i].eq(new BN(0))}
                              available={availableOgg.toNumber()}
                            />
                          </div>
                        )}
                      </div>
                      <LoadedText start="Your available $OGG" value={availableOgg.sub(voteAmount).toString()} />
                      {timeLeft < 0 ?
                        <BasicButton text="Vote in New Epoch" onClick={onNewEpoch} />
                        :
                        <BasicButton text="Vote" onClick={onVote} disabled={false} disabledText={availableOgg.sub(voteAmount).eq(new BN(0)) ? "You have reserved all your $OGG" : "No Reserve allocated"} />
                      }
                      <div className="flex flex-row justify-center items-center gap-2">
                        <p>Using {usingOgc ? "$OGC" : "SOL"} to pay mining fees</p>
                        <Toggle checked={usingOgc} onChange={setUsingOgc} />
                      </div>
                    </div>
                  </>
                  :
                  state === "CLAIM" ?
                    <div className="flex flex-col justify-center items-center w-[50%] h-full gap-10">
                      <BigText text="Claimable $OGC" number={claimableOgc.div(new BN(10 ** ogcDecimals)).toString()} />
                      <BasicButton onClick={onClaim} text="Claim" disabled={claimableOgc.eq(new BN(0))} disabledText="No OGC to claim" />
                    </div>
                    :
                    <div className="flex flex-col justify-center items-center w-full">
                      <Chart data={chartData} />
                      <div className="flex flex-col justify-center items-center">
                        <div className="grid grid-cols-3 w-full">
                          <p>Wallet</p>
                          <p>$OGC Claimed</p>
                          <p>Times Voted</p>
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
    <span className="text-[#ECECEC] font-extrabold drop-shadow-lg">
      {children}
    </span>
  );
}