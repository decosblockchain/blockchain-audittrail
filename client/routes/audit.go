package routes

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math/big"
	"net/http"

	"github.com/decosblockchain/blockchain-audittrail/client/library"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
)

type AuditRecord struct {
	Header  AuditRecordHeader   `json:"h"`
	Details []AuditRecordDetail `json:"d"`
}

type AuditRecordHeader struct {
	Actor  string `json:"a"`
	Intent string `json:"i"`
	Object string `json:"o"`
}

type AuditRecordDetail struct {
	Key   string `json:"k"`
	Value string `json:"v"`
}

type AuditResponse struct {
	RecordHash      string `json:"rh"`
	TransactionHash string `json:"th"`
}

func AuditHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.Header().Set("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Decode the audit record
	decoder := json.NewDecoder(r.Body)
	var auditRecord AuditRecord
	err := decoder.Decode(&auditRecord)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	// Re-encode the JSON to prevent formatting differences
	inputJson, err := json.Marshal(auditRecord)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	hash := sha256.Sum256(inputJson)

	dataBuffer := new(bytes.Buffer)
	actorHash := sha256.Sum256([]byte(auditRecord.Header.Actor))
	intentHash := sha256.Sum256([]byte(auditRecord.Header.Intent))
	objectHash := sha256.Sum256([]byte(auditRecord.Header.Object))

	dataBuffer.Write(actorHash[:])
	dataBuffer.Write(intentHash[:])
	dataBuffer.Write(objectHash[:])
	dataBuffer.Write(hash[:])

	nonce, err := library.GetNonce()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	key, err := library.GetKey()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	addr := crypto.PubkeyToAddress(key.PublicKey)
	signer := types.NewEIP155Signer(big.NewInt(192001))
	tx, err := types.SignTx(types.NewTransaction(nonce, addr, big.NewInt(0), 10000000, big.NewInt(0), dataBuffer.Bytes()), signer, key)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var auditResponse AuditResponse
	auditResponse.RecordHash = hex.EncodeToString(hash[:])
	auditResponse.TransactionHash = tx.Hash().Hex()

	js, err := json.Marshal(auditResponse)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write(js)
}
