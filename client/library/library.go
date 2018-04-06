package library

import (
	"crypto/ecdsa"
	"encoding/binary"
	"io/ioutil"
	"os"
	"sync"

	"github.com/ethereum/go-ethereum/crypto"
)

var keyMutex = &sync.Mutex{}
var nonceMutex = &sync.Mutex{}

var key *ecdsa.PrivateKey
var nonceInitialized bool
var nonce uint64

func GetKey() (*ecdsa.PrivateKey, error) {

	keyMutex.Lock()
	if key == nil {
		if _, err := os.Stat("keyfile.hex"); os.IsNotExist(err) {
			generatedKey, err := crypto.GenerateKey()
			if err != nil {
				keyMutex.Unlock()
				return nil, err
			}
			err = crypto.SaveECDSA("keyfile.hex", generatedKey)
			if err != nil {
				keyMutex.Unlock()
				return nil, err
			}
		}

		privateKey, err := crypto.LoadECDSA("keyfile.hex")
		if err != nil {
			keyMutex.Unlock()
			return nil, err
		}
		key = privateKey

	}
	keyMutex.Unlock()

	return key, nil
}

func writeNonce() error {

	b := make([]byte, 8)
	binary.LittleEndian.PutUint64(b, nonce)

	err := ioutil.WriteFile("nonce.hex", b, 0600)
	return err
}

func readNonce() error {
	if _, err := os.Stat("nonce.hex"); os.IsNotExist(err) {
		err := writeNonce()
		if err != nil {
			return err
		}
	}
	b, err := ioutil.ReadFile("nonce.hex")
	if err != nil {
		return err
	}

	nonce = binary.LittleEndian.Uint64(b)
	return nil
}

func GetNonce() (uint64, error) {

	nonceMutex.Lock()
	if !nonceInitialized {
		err := readNonce()
		if err != nil {
			nonceMutex.Unlock()
			return 0, err
		}
		nonceInitialized = true
	}
	nonce++
	err := writeNonce()
	if err != nil {
		nonceMutex.Unlock()
		return 0, err
	}
	nonceMutex.Unlock()
	return nonce, nil
}
