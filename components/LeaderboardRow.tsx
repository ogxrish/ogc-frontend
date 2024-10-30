import { BN } from "@coral-xyz/anchor";
import { ogcDecimals, shortenAddress } from "./chain";



export default function LeaderboardRow({ row }: { row: any }) {
    return (
        <div className="grid grid-cols-3 w-full">
            <p>{shortenAddress(row.wallet)}</p>
            <p>{new BN(row.claimed).div(new BN(10 ** ogcDecimals))}</p>
            <p>{row.active}</p>
        </div>
    )
}