

type BasicButtonProps = {
    text: string;
    onClick: () => void;
    disabled?: boolean;
    disabledText?: string;
};
export default function BasicButton({ text, onClick, disabled, disabledText }: BasicButtonProps) {
    if (disabled) {
        return (
            <button
                className="w-full cursor-not-allowed text-white text-base py-2 px-6 text-center transition duration-200 ease-in-out 
          bg-gray-400 rounded-[3px] border border-gray-600 text-shadow-[0px_1px_0px_rgba(102,102,102,1)] relative"
            >
                {disabledText || text}
            </button>
        );
    } else {
        return (
            <button
                className="w-full cursor-pointer text-black text-base py-2 px-6 text-center transition duration-200 ease-in-out 
        bg-gradient-to-b from-gray-400 to-white rounded-[3px]
        hover:bg-gradient-to-b hover:from-white hover:to-gray-400 
        active:brightness-90 text-shadow-[0px_1px_0px_rgba(102,102,102,1)] relative"
                onClick={onClick}
            >
                {text}
            </button>
        );
    }
}