function getStoragePersistor(config = {}) {
  const {
    key = 'storePersistor',
    expireIn = Date.now() + (24 * 3600 * 1000)
  } = config

  /**
   * @type {{
      clear:()=>void,
      getItem:(key:string)=>any,
      removeItem: (key: string) => void,
      subscribe: (observer: function) => void,
      setItem: (key:string, value:any, expireIn?: number) => void
   * }} */
  let storagePersistor = null

  const storeKey = btoa(key)
  const observers = []
  const store = { expireIn }

  const setStore = data => {
    Object.assign(store, data)
  }

  /** @param {string} key */
  const getItem = key => {
    /** @type {{value: any, expireIn?: number}} */
    const data = store[key]

    if (!data) return

    if (!data.expireIn) return data.value

    if (data.expireIn <= Date.now()) return

    return data.value
  }

  /**
   * @param {string} key 
   * @param {any} value 
   * @param {number} expireIn time to expire content, in minutes
   */
  const setItem = (key, value, expireIn = null) => {
    const store = { [key]: { value } }

    if (expireIn)
      store[key].expireIn = Date.now() + expireIn * 60000

    setStore(store)

    updateStore()
  }

  const clear = () => {
    for (const key of Object.keys(store)) delete store[key]

    updateStore()
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
    const encryptedStore = btoa(stringifiedStore)

    localStorage.setItem(storeKey, encryptedStore)
    notifyAll()
  }

  const _init = () => {
    if (!!storagePersistor) return storagePersistor
    
    try {
      const encryptedStorePersisted = localStorage.getItem(storeKey)

      /** @type {{expireIn: number, [name:string]: any}} */
      const decryptedStore = atob(encryptedStorePersisted)

      if (decryptedStore.expireIn <= Date.now()) return

      setStore(decryptedStore)
    } catch (error) {
      console.log('store could not be loaded due to inconsistency to data, state was cleared')
      console.trace(error)
    }

    storagePersistor = { clear, getItem, removeItem, setItem, subscribe }

    return storagePersistor
  }

  return _init()
}