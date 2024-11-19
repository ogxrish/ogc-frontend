
type PoolWidgetProps = {
    title: string;
    percent: number;
    voted: number;
    total: number;
    added: number;
    addAmount: number;
    available: number;
    onChangeAddAmount: (n: number) => void;
    addDisabled?: boolean;
    subtractDisabled?: boolean;
};

export default function PoolWidget({ title, percent, voted, added, total, addAmount, onChangeAddAmount, addDisabled, subtractDisabled, available }: PoolWidgetProps) {
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value);
        if (!Number.isNaN(value)) {
            onChangeAddAmount(value - addAmount);
        }
    };
    return (
        <div className="flex flex-col justify-center items-center gap-2">
            <p>{title}</p>
            <div className="relative flex flex-col justify-end items-center w-16 md:w-32 aspect-square border-2 border-white rounded-lg">
                <div className="w-full bg-green-500" style={{ height: `${Math.min(added, 100)}%` }}></div>
                <div className="w-full bg-yellow-500" style={{height: `${Math.min(voted, 100)}%`}}></div>
                <div className="w-full bg-gray-500 rounded-b-md" style={{ height: `${Math.min(percent, 100)}%` }}></div>
                <p className="absolute top-0 left-0 w-full h-full text-center align-center">{total.toString()}</p>
            </div>
            <div className="flex flex-row justify-center items-center md:gap-2">
            <button disabled={subtractDisabled} onClick={() => onChangeAddAmount(Math.max(-100, -1 * addAmount))} className={`w-4 md:w-7 text-[8px] md:text-base aspect-square text-center rounded-full border border-white ${subtractDisabled ? "opacity-30 hover:cursor-not-allowed" : "cursor-pointer"}`}>
                    -
                </button>
                <input
                    value={addAmount}
                    type="text"
                    className="w-5 md:w-10 bg-transparent focus:outline-none text-center"
                    onChange={handleInputChange}
                />
                <button disabled={addDisabled} onClick={() => onChangeAddAmount(Math.min(100, available))} className={`w-4 md:w-7 text-[8px] md:text-base aspect-square rounded-full border border-white ${addDisabled ? "opacity-30 hover:cursor-not-allowed" : "cursor-pointer"}`}>
                    +
                </button>
            </div>
        </div>
    );
}