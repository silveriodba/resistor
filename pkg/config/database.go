package config

import (
	"fmt"
	"strings"
	// _ needed to mysql
	_ "github.com/go-sql-driver/mysql"
	"github.com/go-xorm/core"
	"github.com/go-xorm/xorm"

	"os"
	"sync/atomic"
	// _ needed to sqlite3
	_ "github.com/mattn/go-sqlite3"
)

func (dbc *DatabaseCfg) resetChanges() {
	atomic.StoreInt64(&dbc.numChanges, 0)
}

func (dbc *DatabaseCfg) addChanges(n int64) {
	atomic.AddInt64(&dbc.numChanges, n)
}
func (dbc *DatabaseCfg) getChanges() int64 {
	return atomic.LoadInt64(&dbc.numChanges)
}

//DbObjAction measurement groups to assign to devices
type DbObjAction struct {
	Type     string
	TypeDesc string
	ObID     string
	Action   string
}

//InitDB initialize de BD configuration
func (dbc *DatabaseCfg) InitDB() {
	// Create ORM engine and database
	var err error
	var dbtype string
	var datasource string

	log.Debugf("Database config: %+v", dbc)

	switch dbc.Type {
	case "sqlite3":
		dbtype = "sqlite3"
		datasource = dataDir + "/" + dbc.Name + ".db"
	case "mysql":
		dbtype = "mysql"
		protocol := "tcp"
		if strings.HasPrefix(dbc.Host, "/") {
			protocol = "unix"
		}
		datasource = fmt.Sprintf("%s:%s@%s(%s)/%s?charset=utf8", dbc.User, dbc.Password, protocol, dbc.Host, dbc.Name)

	default:
		log.Errorf("unknown db  type %s", dbc.Type)
		return
	}

	dbc.x, err = xorm.NewEngine(dbtype, datasource)
	if err != nil {
		log.Fatalf("Fail to create engine: %v\n", err)
	}

	if len(dbc.SQLLogFile) != 0 {
		dbc.x.ShowSQL(true)
		f, error := os.Create(logDir + "/" + dbc.SQLLogFile)
		if err != nil {
			log.Errorln("Fail to create log file  ", error)
		}
		dbc.x.SetLogger(xorm.NewSimpleLogger(f))
	}
	if dbc.Debug == "true" {
		dbc.x.Logger().SetLevel(core.LOG_DEBUG)
	}

	// Sync tables
	if err = dbc.x.Sync(new(IfxServerCfg)); err != nil {
		log.Fatalf("Fail to sync table InfluxServerCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(IfxDBCfg)); err != nil {
		log.Fatalf("Fail to sync table IfxDBCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(IfxMeasurementCfg)); err != nil {
		log.Fatalf("Fail to sync table IfxMeasurementCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(IfxDBMeasRel)); err != nil {
		log.Fatalf("Fail to sync table IfxDBMeasRel: %v\n", err)
	}
	if err = dbc.x.Sync(new(DeviceStatCfg)); err != nil {
		log.Fatalf("Fail to sync table DeviceStatCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(TemplateCfg)); err != nil {
		log.Fatalf("Fail to sync table TemplateCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(ProductCfg)); err != nil {
		log.Fatalf("Fail to sync table ProductCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(ProductGroupCfg)); err != nil {
		log.Fatalf("Fail to sync table ProductGroupCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(KapacitorCfg)); err != nil {
		log.Fatalf("Fail to sync table KapacitorCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(OperationCfg)); err != nil {
		log.Fatalf("Fail to sync table OperationCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(RangeTimeCfg)); err != nil {
		log.Fatalf("Fail to sync table RangeTimeCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(EndpointCfg)); err != nil {
		log.Fatalf("Fail to sync table EndpointCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(AlertEndpointRel)); err != nil {
		log.Fatalf("Fail to sync table Alert and Endpoint Relationship: %v\n", err)
	}
	if err = dbc.x.Sync(new(AlertIDCfg)); err != nil {
		log.Fatalf("Fail to sync table AlertIDCfg: %v\n", err)
	}
	if err = dbc.x.Sync(new(AlertEventHist)); err != nil {
		log.Fatalf("Fail to sync table AlertEventHist: %v\n", err)
	}
	if err = dbc.x.Sync(new(AlertEvent)); err != nil {
		log.Fatalf("Fail to sync table AlertEvent: %v\n", err)
	}
}

//LoadDbConfig get data from database
func (dbc *DatabaseCfg) LoadDbConfig(cfg *DBConfig) {
	var err error

	//Load Kapacitor engines map
	cfg.Kapacitor, err = dbc.GetKapacitorCfgMap("")
	if err != nil {
		log.Warningf("Some errors on get Kapacitor servers map :%v", err)
	}
	cfg.Endpoint, err = dbc.GetEndpointCfgMap("")
	if err != nil {
		log.Warningf("Some errors on get Endpoint map :%v", err)
	}
	cfg.Operation, err = dbc.GetOperationCfgMap("")
	if err != nil {
		log.Warningf("Some errors on get Operations map :%v", err)
	}
	cfg.RangeTime, err = dbc.GetRangeTimeCfgMap("")
	if err != nil {
		log.Warningf("Some errors on get RangeTimes map :%v", err)
	}
	cfg.Product, err = dbc.GetProductCfgMap("")
	if err != nil {
		log.Warningf("Some errors on get Products map :%v", err)
	}
	cfg.AlertID, err = dbc.GetAlertIDCfgMap("")
	if err != nil {
		log.Warningf("Some errors on get AlertID map :%v", err)
	}
	cfg.DeviceStat, err = dbc.GetDeviceStatCfgMap("")
	if err != nil {
		log.Warningf("Some errors on get DeviceStats map :%v", err)
	}
	cfg.Template, err = dbc.GetTemplateCfgMap("")
	if err != nil {
		log.Warningf("Some errors on get Templates map :%v", err)
	}
	cfg.AlertEventHistMap, err = dbc.GetAlertEventHistMap("")
	if err != nil {
		log.Warningf("Some errors on get AlertEventHist map :%v", err)
	}
	cfg.AlertEventMap, err = dbc.GetAlertEventMap("")
	if err != nil {
		log.Warningf("Some errors on get AlertEvent map :%v", err)
	}

	dbc.resetChanges()
}
