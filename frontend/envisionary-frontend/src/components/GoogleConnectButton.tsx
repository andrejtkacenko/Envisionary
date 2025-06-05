import React from "react";

interface GoogleConnectButtonProps {
  isConnected: boolean;
  onConnect: () => void;
}

const GoogleConnectButton: React.FC<GoogleConnectButtonProps> = ({
  isConnected,
  onConnect,
}) => {
  return (
    <button
      onClick={onConnect}
      className={`px-4 py-2 rounded ${
        isConnected ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
      } text-white`}
    >
      {isConnected ? "Disconnect Google Calendar" : "Connect Google Calendar"}
    </button>
  );
};

export default GoogleConnectButton;