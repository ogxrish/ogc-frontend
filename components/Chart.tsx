import { CartesianGrid, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Line } from "recharts";



export default function Chart({ data }: { data: any; }) {
    return (
        <div className="w-full flex flex-row justify-center items-center gap-2">
            <ResponsiveContainer width={"50%"} height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="id" />
                    <YAxis yAxisId="right" orientation="right" />
                    <YAxis yAxisId="left" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalReserve" yAxisId="right" stroke="#82ca9d" />
                    <Line type="monotone" dataKey="totalReservers" yAxisId="left" stroke="#ffc658" />
                </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width={"50%"} height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="id" />
                    <YAxis yAxisId="right" orientation="right" />
                    <YAxis yAxisId="left" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="unlockableOgg" yAxisId="right" stroke="#ff0000" />
                    <Line type="monotone" dataKey="lockedOgg" yAxisId="right" stroke="#8884d8" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}