

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
                className={`text-xs hover:cursor-not-allowed md:text-base text-gray-700 justify-center shadow-inner shadow-gray-600 flex items-center border w-full text-center py-4 gap-2 border-gray-700 bg-black`}
            >
                {disabledText || text}
            </button>
        );
    }
    return (
        <button
            className={`text-xs md:text-base shadow-inner shadow-white flex items-center justify-center border w-full py-4 gap-2 text-center border-white bg-black`}
            onClick={onClick}
        >
            {text}
        </button>
    );
}