import React from 'react'

const Controls: React.FC = () => {
  return (
    <div className="absolute bottom-5 right-5 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs">
      <h4 className="mb-2.5 text-blue-400">Controls</h4>
      <div className="my-1">Click to move your character</div>
      <div className="my-1">Use tools to place furniture</div>
      <div className="my-1">ESC to cancel actions</div>
      <div className="my-1">1-4 to switch players</div>
      <div className="my-1">Enter to chat</div>
    </div>
  )
}

export default Controls
