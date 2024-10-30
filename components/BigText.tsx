
type BigTextProps = {
    text: string;
    number: string;
    size?: string;
};
export default function BigText({ text, number, size }: BigTextProps) {
    return (
        <div className="flex flex-col justify-center items-center">
            <p className="text-3xl md:text-6xl lg:text-8xl font-bold">{number}</p>
            <p className="text-xs md:text-sm lg:text-base">{text}</p>
        </div>
    );
}