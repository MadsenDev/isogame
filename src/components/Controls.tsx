import React from 'react'

const Controls: React.FC = () => {
  return (
    <div className="iso-guide__card">
      <span className="iso-guide__label">Controls</span>
      <ul className="iso-guide__list">
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
