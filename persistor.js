class StoreItem {
  /**
   * 
   * @param {any} value 
   * @param {number?} expireIn 
   */
  constructor(value, expireIn) {
    this.value = value
    this.expireIn = expireIn
  }

  parseFromString(str) {
    const { value, expireIn } = JSON.parse(str)

    return new StoreItem(value, expireIn)
  }
}

/** @param {{path?: string, expireIn?: number}} config */
function getPersistentStorage(config) {
  const {
    path = 'storage',
    expireIn
  } = config ?? {}

  /** @type {{expireIn: number, [key:string]: StoreItem}} */
  const store = { expireIn }
  const observers = []

  const setStore = data => {
    Object.assign(store, data)
  }

  /** @param {string} key */
  const getItem = key => {
    
    const data = store[key]

    if (!data) return

    if (!data.expireIn) return data.value

    if (data.expireIn <= Date.now()) return removeItem(key)

    return data.value
  }

  /** @param {string} key @param {any} value @param {number} expireIn time to expire content, in minutes */
  const setItem = (key, value, expireIn) => {
    const storeItem = new StoreItem(value, Date.now() + expireIn * 60000)
    
    const store = { [key]: storeItem }

    setStore(store)

    updateStore()
  }

  const clear = () => {
    for (const key of Object.keys(store)) delete store[key]

    updateStore()

    localStorage.removeItem(path)
  }

  /** @param {string} key */
  const removeItem = key => {
    delete store[key]

    updateStore()
  }

  /** @param {function} observer */
  const subscribe = observer => {
    if (typeof observer==='function') observers.push(observer)
  }

  const notifyAll = () => observers.forEach(o => o())

  const updateStore = () => {
    const stringifiedStore = JSON.stringify(store)

    localStorage.setItem(path, stringifiedStore)

    notifyAll()
  }

  const _init = () => {    
    try {
      const encryptedStorePersisted = localStorage.getItem(path)

      const stringified = encryptedStorePersisted.toString()
      
      /** @type {{expireIn: number, [name:string]: any}} */
      const parsedStore = stringified
        ?JSON.parse(stringified)
        :{expireIn}

      if (!parsedStore?.expireIn) {}
      else if (parsedStore.expireIn <= Date.now()) throw Error('Store Expired')

      setStore(parsedStore)
    } catch (error) {
      console.log('store could not be loaded due to inconsistent data, state was cleared')
      console.error(error)
    }

    return { clear, getItem, removeItem, setItem, subscribe }
  }

  return _init()
}