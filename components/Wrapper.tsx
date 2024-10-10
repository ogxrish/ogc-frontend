

export default function Wrapper({ children }: { children: React.ReactNode; }) {
    return (
        <div className="w-screen min-h-screen flex flex-col justify-start items-center relative">
            {children}
        </div>
    );
}