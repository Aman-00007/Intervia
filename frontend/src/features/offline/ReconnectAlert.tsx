import { Button } from "../../shared/components/UI";
export function ReconnectAlert({ onReconnect }: { onReconnect: () => void }) { return <div className="error" role="alert">Connection interrupted. Your local black box is preserving changes. <Button onClick={onReconnect}>Reconnect →</Button></div>; }
