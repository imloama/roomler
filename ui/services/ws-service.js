
import cookies from 'js-cookie'
import consola from 'consola'

// readyState
// 0 - CONNECTING - Socket has been created. The connection is not yet open.
// 1 - OPEN - The connection is open and ready to communicate.
// 2 - CLOSING - The connection is in the process of closing.
// 3 - CLOSED - The connection is closed or couldn't be opened.
class WsService {
  constructor (host, store) {
    this.counter = 0 // used as reconnect counter
    this.host = host
    this.store = store
    this.subscriptions = {
      onopen: [],
      onclose: [],
      onerror: [],
      onmessage: []
    }
  }

  subscribe (name, handler) {
    this.subscriptions[name].push(handler)
  }

  unsubscribe (name, handler) {
    this.subscriptions[name] = this.subscriptions[name].filter(h => h !== handler)
  }

  connect () {
    const self = this
    consola.info('Trying to open Web Socket...')
    if (this.ws) {
      consola.info('Closing existing Web Socket...')
      this.ws.close(1000)
    }
    this.ws = new WebSocket(`${this.host}`)

    this.ws.onopen = (event) => {
      consola.info(`WebSocket opened: ${event}`)
      if (self.counter > 0 && cookies.get('token')) {
        if (self.store.state.api.auth.user && self.store.state.api.auth.user._id) {
          self.store.dispatch('api/auth/me')
            .then(() => {
              return Promise.all([
                self.store.dispatch('api/invite/acceptPendingInvites'),
                self.store.dispatch('api/invite/acceptPendingJoins', self.store.state.api.auth.user._id)
              ])
            })
            .then(() => {
              return Promise.all([
                self.store.dispatch('api/room/getAll'),
                self.store.dispatch('api/auth/getPeers')
              ])
            })
            .then((data) => {
              if (data && data[0] && data[0].result) {
                return Promise.all([self.store.dispatch('api/room/calls/getAll'), ...data[0].result.map(room => self.store.dispatch('api/message/getAll', { room }))])
              }
            })
        }
      }
      self.subscriptions.onopen.forEach((handler) => {
        handler(event)
      })
      self.counter++
    }
    this.ws.onclose = (event) => {
      consola.info(`WebSocket closed: ${JSON.stringify(event.code)}`)
      self.subscriptions.onclose.forEach((handler) => {
        handler(event)
      })
      if (event.code !== 1000) {
        setTimeout(() => {
          self.connect(self.host)
        }, 2000)
      }
    }

    this.ws.onerror = (event) => {
      consola.info(`WebSocket error: ${event}`)
      self.subscriptions.onerror.forEach((handler) => {
        handler(event)
      })
    }

    this.ws.onmessage = (msg) => {
      self.subscriptions.onmessage.forEach((handler) => {
        handler(msg)
      })
    }
  }

  send (msg) {
    this.ws.send(msg)
  }
}
export default WsService
