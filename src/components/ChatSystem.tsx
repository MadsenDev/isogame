import React, { useRef, useEffect } from 'react'
import { useGame } from '../context/GameContext'

interface ChatSystemProps {
  visible?: boolean
}

const ChatSystem: React.FC<ChatSystemProps> = ({ visible }) => {
  const { state, dispatch } = useGame()
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  const isVisible = visible ?? state.showChat

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [state.chatMessages, isVisible])

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

  if (!isVisible) return null

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
