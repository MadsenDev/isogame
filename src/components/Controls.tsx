import React from 'react'

const Controls: React.FC = () => {
  return (
    <div className="neo-guide__card">
      <span className="neo-guide__label">Controls</span>
      <ul className="neo-guide__list">
        <li>Click to move your character</li>
        <li>Use tools to place furniture</li>
        <li>ESC to cancel actions</li>
        <li>1-4 to switch players</li>
        <li>Enter to chat</li>
      </ul>
    </div>
  )
}

export default Controls
