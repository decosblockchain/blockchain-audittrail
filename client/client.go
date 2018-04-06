package main

import (
	"log"
	"net/http"

	"github.com/decosblockchain/blockchain-audittrail/client/routes"

	"github.com/gorilla/mux"
	"github.com/kardianos/service"
)

var logger service.Logger

type program struct{}

func (p *program) Start(s service.Service) error {
	// Start should not block. Do the actual work async.
	go p.run()
	return nil
}
func (p *program) run() {
	r := mux.NewRouter()
    r.HandleFunc("/audit", routes.AuditHandler)
	
	log.Fatal(http.ListenAndServe(":8000", r))
}
func (p *program) Stop(s service.Service) error {
	// Stop should not block. Return with a few seconds.
	return nil
}

func main() {
	svcConfig := &service.Config{
		Name:        "DecosBlockchainAuditConnector",
		DisplayName: "Decos Blockchain Audit Connector",
		Description: "This service acts as a signing & sending proxy for the Decos Blockchain Audit Service",
	}

	prg := &program{}
	s, err := service.New(prg, svcConfig)
	if err != nil {
		log.Fatal(err)
	}
	logger, err = s.Logger(nil)
	if err != nil {
		log.Fatal(err)
	}
	err = s.Run()
	if err != nil {
		logger.Error(err)
	}
}
