import React, { useRef, useEffect } from 'react'
import { useGame } from '../context/GameContext'

const ChatSystem: React.FC = () => {
  const { state, dispatch } = useGame()
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [state.chatMessages])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const message = inputRef.current?.value.trim()
      if (message) {
        const player = state.players[state.currentPlayerId]
        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          payload: {
            text: `${player?.name || 'Player'}: ${message}`,
            timestamp: Date.now()
          }
        })
        inputRef.current!.value = ''
      }
    }
  }

  if (!state.showChat) return null

  return (
    <div className="habbo-chat">
      <div ref={messagesRef} className="habbo-chat__messages">
        {state.chatMessages.slice(-10).map((msg, index) => (
          <div key={index} className="habbo-chat__message">
            {msg.text}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        className="habbo-chat__input"
        placeholder="Type a message..."
        onKeyPress={handleKeyPress}
      />
    </div>
  )
}

export default ChatSystem
