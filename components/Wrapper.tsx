

export default function Wrapper({ children }: { children: React.ReactNode; }) {
    return (
        <div className="w-screen min-h-screen flex flex-col justify-start items-center relative" style={{backgroundImage: "url('/coin.gif')", backgroundSize: "5%"}}>
            {children}
        </div>
    );
}