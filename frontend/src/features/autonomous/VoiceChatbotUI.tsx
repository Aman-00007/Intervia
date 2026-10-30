import { useState } from "react";
export function VoiceChatbotUI() { const [active, setActive] = useState(false); return <button className="secondary" onClick={() => setActive(!active)}>{active ? "Stop voice helper" : "Start voice helper"} ↗</button>; }
