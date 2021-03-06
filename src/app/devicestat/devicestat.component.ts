import { Component, ChangeDetectionStrategy, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, Validators} from '@angular/forms';
import { FormArray, FormGroup, FormControl} from '@angular/forms';

import { DeviceStatService } from './devicestat.service';
import { AlertService } from '../alert/alert.service';
import { ProductService } from '../product/product.service';

import { ValidationService } from '../common/custom-validation/validation.service'
import { ExportServiceCfg } from '../common/dataservice/export.service'
import { ExportFileModal } from '../common/dataservice/export-file-modal';

import { GenericModal } from '../common/custom-modal/generic-modal';
import { Observable } from 'rxjs/Rx';

import { TableListComponent } from '../common/table-list.component';
import { DeviceStatComponentConfig, TableRole, OverrideRoleActions } from './devicestat.data';
import { IMultiSelectOption, IMultiSelectSettings, IMultiSelectTexts } from '../common/multiselect-dropdown';

declare var _:any;

@Component({
  selector: 'devicestat-component',
  providers: [DeviceStatService, AlertService, ProductService, ValidationService],
  templateUrl: './devicestat.component.html',
  styleUrls: ['../../css/component-styles.css']
})

export class DeviceStatComponent implements OnInit {
  @ViewChild('viewModal') public viewModal: GenericModal;
  @ViewChild('viewModalDelete') public viewModalDelete: GenericModal;
  @ViewChild('listTableComponent') public listTableComponent: TableListComponent;
  @ViewChild('exportFileModal') public exportFileModal : ExportFileModal;


  public editmode: string; //list , create, modify
  public componentList: Array<any>;
  public filter: string;
  public sampleComponentForm: any;
  public alertHandler : any = null;
  public counterItems : number = null;
  public counterErrors: any = [];
  public defaultConfig : any = DeviceStatComponentConfig;
  public tableRole : any = TableRole;
  public overrideRoleActions: any = OverrideRoleActions;
  public select_product : IMultiSelectOption[] = [];
  public select_alert : IMultiSelectOption[] = [];
  public select_device : IMultiSelectOption[] = [];
  public select_baseline : IMultiSelectOption[] = [];
  public select_tag : IMultiSelectOption[] = [];
  public select_product_custom : IMultiSelectOption[] = [];
  public select_alert_custom : IMultiSelectOption[] = [];
  public select_device_custom : IMultiSelectOption[] = [];
  public select_baseline_custom : IMultiSelectOption[] = [];
  public select_tag_custom : IMultiSelectOption[] = [];
  private single_select: IMultiSelectSettings = {singleSelect: true};
  private single_and_custom: IMultiSelectSettings = {singleSelect: true, allowCustomItem: true};

  public selectedArray : any = [];

  public product_list : any = [];
  public picked_product: any = null;

  public alert_list : any = [];
  public picked_alert: any = null;

  public data : Array<any>;
  public isRequesting : boolean;

  private builder;
  private oldID : string;

  ngOnInit() {
    this.editmode = 'list';
    this.reloadData();
  }

  constructor(public devicestatService: DeviceStatService, public alertService: AlertService, public productService: ProductService, public exportServiceCfg: ExportServiceCfg, builder: FormBuilder) {
    this.builder = builder;
  }

  createStaticForm() {
    this.sampleComponentForm = this.builder.group({
      ID: [this.sampleComponentForm ? this.sampleComponentForm.value.ID : ''],
      OrderID: [this.sampleComponentForm ? this.sampleComponentForm.value.OrderID : '', Validators.required],
      DeviceID: [this.sampleComponentForm ? this.sampleComponentForm.value.DeviceID : '', Validators.required],
      AlertID: [this.sampleComponentForm ? this.sampleComponentForm.value.AlertID : '', Validators.required],
      ProductID: [this.sampleComponentForm ? this.sampleComponentForm.value.ProductID : '', Validators.required],
      ExceptionID: [this.sampleComponentForm ? this.sampleComponentForm.value.ExceptionID : '', Validators.required],
      Active: [this.sampleComponentForm ? this.sampleComponentForm.value.Active : '', Validators.required],
      BaseLine: [this.sampleComponentForm ? this.sampleComponentForm.value.BaseLine : '', Validators.required],
      FilterTagKey: [this.sampleComponentForm ? this.sampleComponentForm.value.FilterTagKey : ''],
      FilterTagValue: [this.sampleComponentForm ? this.sampleComponentForm.value.FilterTagValue : ''],
      Description: [this.sampleComponentForm ? this.sampleComponentForm.value.Description : '']
    });
  }

  reloadData() {
    // now it's a simple subscription to the observable
    this.alertHandler = null;
    this.devicestatService.getDeviceStatItem(null)
      .subscribe(
      data => {
        this.isRequesting = false;
        this.componentList = data
        this.data = data;
        this.editmode = "list";
      },
      err => console.error(err),
      () => console.log('DONE')
      );
  }

  customActions(action : any) {
    console.log(action);
    switch (action.option) {
      case 'new' :
        this.newItem();
      break;
      case 'export' :
        this.exportItem(action.event);
      break;
      case 'view':
        this.viewItem(action.event);
      break;
      case 'edit':
        this.editSampleItem(action.event);
      break;
      case 'remove':
        this.removeItem(action.event);
      break;
      case 'tableaction':
        this.applyAction(action.event, action.data);
      break;
    }
  }

  applyAction(action : any, data? : Array<any>) : void {
    console.log(action);
    this.selectedArray = data || [];
    console.log(this.selectedArray);
    switch(action.action) {
       case "RemoveAllSelected": {
          this.removeAllSelectedItems(this.selectedArray);
          break;
       }
       case "ChangeProperty": {
          this.updateAllSelectedItems(this.selectedArray,action.field,action.value)
          break;
       }
       case "AppendProperty": {
         this.updateAllSelectedItems(this.selectedArray,action.field,action.value,true);
       }
       default: {
          break;
       }
    }
  }

  viewItem(id) {
    this.viewModal.parseObject(id);
  }

  exportItem(item : any) : void {
    this.exportFileModal.initExportModal(item);
  }

  removeAllSelectedItems(myArray) {
    let obsArray = [];
    this.counterItems = 0;
    this.isRequesting = true;
    for (let i in myArray) {
      console.log("Removing ",myArray[i].ID)
      this.deleteSampleItem(myArray[i].ID,true);
      obsArray.push(this.deleteSampleItem(myArray[i].ID,true));
    }
    this.genericForkJoin(obsArray);
    console.log(this.counterItems);
  }

  removeItem(row) {
    let id = row.ID;
    console.log('remove', id);
    this.devicestatService.checkOnDeleteDeviceStatItem(id)
      .subscribe(
        data => {
          console.log(data);
        this.viewModalDelete.parseObject(data)
      },
      err => console.error(err),
      () => { }
      );
  }
  newItem() {
    //No hidden fields, so create fixed Form
    this.getProductItem();
    this.createStaticForm();
    this.editmode = "create";
  }

  editSampleItem(row) {
    let id = row.ID;
    this.getProductItem();
    this.devicestatService.getDeviceStatItemById(id)
      .subscribe(data => {
        this.sampleComponentForm = {};
        this.sampleComponentForm.value = data;
        this.oldID = data.ID;
        this.createStaticForm();
        this.setInitValues();
        this.editmode = "modify";
      },
      err => console.error(err)
      );
 	}

  deleteSampleItem(id, recursive?) {
    if (!recursive) {
    this.devicestatService.deleteDeviceStatItem(id)
      .subscribe(data => { },
      err => console.error(err),
      () => { this.viewModalDelete.hide(); this.reloadData() }
      );
    } else {
      return this.devicestatService.deleteDeviceStatItem(id)
      .do(
        (test) =>  { this.counterItems++; console.log(this.counterItems)},
        (err) => { this.counterErrors.push({'ID': id, 'error' : err})}
      );
    }
  }

  cancelEdit() {
    this.editmode = "list";
    this.reloadData();
  }

  saveSampleItem() {
    console.log("SAVE");
    if (this.sampleComponentForm.valid) {
      this.devicestatService.addDeviceStatItem(this.sampleComponentForm.value)
        .subscribe(data => { console.log(data) },
        err => {
          console.log(err);
        },
        () => { this.editmode = "list"; this.reloadData() }
        );
    }
  }

  updateAllSelectedItems(mySelectedArray,field,value, append?) {
    let obsArray = [];
    this.counterItems = 0;
    this.isRequesting = true;
    if (!append)
    for (let component of mySelectedArray) {
      component[field] = value;
      obsArray.push(this.updateSampleItem(true,component));
    } else {
      let tmpArray = [];
      if(!Array.isArray(value)) value = value.split(',');
      console.log(value);
      for (let component of mySelectedArray) {
        console.log(value);
        //check if there is some new object to append
        let newEntries = _.differenceWith(value,component[field],_.isEqual);
        tmpArray = newEntries.concat(component[field])
        console.log(tmpArray);
        component[field] = tmpArray;
        obsArray.push(this.updateSampleItem(true,component));
      }
    }
    this.genericForkJoin(obsArray);
    //Make sync calls and wait the result
    this.counterErrors = [];
  }

  updateSampleItem(recursive?, component?) {
    if(!recursive) {
      if (this.sampleComponentForm.valid) {
        var r = true;
        if (this.sampleComponentForm.value.ID != this.oldID) {
          r = confirm("Changing DeviceStat Instance ID from " + this.oldID + " to " + this.sampleComponentForm.value.ID + ". Proceed?");
        }
        if (r == true) {
          this.devicestatService.editDeviceStatItem(this.sampleComponentForm.value, this.oldID)
            .subscribe(data => { console.log(data) },
            err => console.error(err),
            () => { this.editmode = "list"; this.reloadData() }
            );
        }
      }
    } else {
      return this.devicestatService.editDeviceStatItem(component, component.ID)
      .do(
        (test) =>  { this.counterItems++ },
        (err) => { this.counterErrors.push({'ID': component['ID'], 'error' : err['_body']})}
      )
      .catch((err) => {
        return Observable.of({'ID': component.ID , 'error': err['_body']})
      })
    }
  }


  testSampleItemConnection() {
    this.devicestatService.testDeviceStatItem(this.sampleComponentForm.value)
    .subscribe(
    data =>  this.alertHandler = {msg: 'DeviceStat Version: '+data['Message'], result : data['Result'], elapsed: data['Elapsed'], type: 'success', closable: true},
    err => {
        let error = err.json();
        this.alertHandler = {msg: error['Message'], elapsed: error['Elapsed'], result : error['Result'], type: 'danger', closable: true}
      },
    () =>  { console.log("DONE")}
  );

  }

  genericForkJoin(obsArray: any) {
    Observable.forkJoin(obsArray)
              .subscribe(
                data => {
                  this.selectedArray = [];
                  this.reloadData()
                },
                err => console.error(err),
              );
  }

  getProductItem() {
    this.productService.getProductItem(null)
      .subscribe(
      data => {
        this.product_list = data;
        this.select_product = [];
        this.select_product = this.createMultiselectArray(data, 'ID', 'ID');
      },
      err => console.error(err),
      () => console.log('DONE')
      );
  }

  pickProductItem(product_picked) {
    if (this.picked_product) {
      if (product_picked !== this.picked_product['ID']) {
        if (this.select_baseline.length > 0) this.select_baseline = this.select_baseline.filter(item => item.extraData==='Custom Item');
        if (this.select_alert.length > 0) this.select_alert = this.select_alert.filter(item => item.extraData==='Custom Item');
        if (this.select_device.length > 0) this.select_device = this.select_device.filter(item => item.extraData==='Custom Item');
        if (this.select_tag.length > 0) this.select_tag = this.select_tag.filter(item => item.extraData==='Custom Item');
      }
    }
    this.picked_product = this.product_list.filter((x) => x['ID'] === product_picked)[0];

    if(this.picked_product) {
      if (this.select_baseline.length > 0) this.select_baseline_custom = this.select_baseline.filter(item => item.extraData==='Custom Item');
      if (this.select_alert.length > 0) this.select_alert_custom = this.select_alert.filter(item => item.extraData==='Custom Item');
      if (this.select_device.length > 0) this.select_device_custom = this.select_device.filter(item => item.extraData==='Custom Item');
      if (this.select_tag.length > 0) this.select_tag_custom = this.select_tag.filter(item => item.extraData==='Custom Item');
      this.select_baseline = [];
      this.select_alert = [];
      this.select_device = [];
      this.select_tag = [];
      this.getBaseLineItem();
      this.getAlertItem(this.picked_product['ID']);
      this.getDeviceItemByProductId(this.picked_product['ID']);
      this.getFilterTagKeyItem();
    }
  }

  getBaseLineItem() {
    this.select_baseline = this.createMultiselectArray(this.picked_product['BaseLines']);
    //remove from select_baseline_custom items with id in select_baseline
    this.select_baseline_custom = this.removeDuplicates(this.select_baseline_custom, this.select_baseline);
    //add select_baseline_custom to select_baseline
    this.select_baseline = this.select_baseline_custom.concat(this.select_baseline);
  }

  /*
  pickBaseLineItem(baseline_picked) {
    if (this.picked_baseline) {
      if (baseline_picked !== this.picked_baseline['ID']) {
        if (this.select_alert.length > 0) this.select_alert = this.select_alert.filter(item => item.extraData==='Custom Item');
      }
    }
    this.picked_baseline = this.baseline_list.filter((x) => x['ID'] === baseline_picked)[0];

    if(this.picked_baseline) {
      if (this.select_alert.length > 0) this.select_alert_custom = this.select_alert.filter(item => item.extraData==='Custom Item');
      this.select_alert = [];
      this.getAlertItem(this.picked_product['ID']);
    }
  }
  */

  getFilterTagKeyItem() {
    let tagsarray : string[] = [this.picked_product['ProductTag']];
    tagsarray = tagsarray.concat(this.picked_product['CommonTags']);
    tagsarray = tagsarray.concat(this.picked_product['ExtraTags']);
    this.select_tag = this.createMultiselectArray(tagsarray);
    //remove from select_tag_custom items with id in select_tag
    this.select_tag_custom = this.removeDuplicates(this.select_tag_custom, this.select_tag);
    //add select_tag_custom to select_tag
    this.select_tag = this.select_tag_custom.concat(this.select_tag);
  }

  getAlertItem(product_id) {
    this.alertService.getAlertItemByProductId(product_id)
      .subscribe(
      data => {
        this.alert_list = data;
        this.select_alert = [];
        this.select_alert = this.createMultiselectArray(data, 'ID', 'ID');
        //remove from select_alert_custom items with id in select_alert
        this.select_alert_custom = this.removeDuplicates(this.select_alert_custom, this.select_alert);
        //add select_alert_custom to select_alert
        this.select_alert = this.select_alert_custom.concat(this.select_alert);
      },
      err => console.error(err),
      () => console.log('DONE')
      );
  }

  pickAlertItem(alert_picked) {
    this.picked_alert = this.alert_list.filter((x) => x['ID'] === alert_picked)[0];

    if (this.picked_alert) {
      if (this.select_device.length > 0) this.select_device_custom = this.select_device.filter(item => item.extraData==='Custom Item');
      this.getDeviceItemByAlertId(this.picked_alert['ID']);
    }
  }

  getDeviceItemByProductId(product_id) {
    if (product_id.length > 0) {
      this.devicestatService.getDeviceItemByProductId(product_id)
      .subscribe(
      data => {
        this.select_device = [];
        this.select_device = this.createMultiselectArray(data);
        //remove from select_device_custom items with id in select_device
        this.select_device_custom = this.removeDuplicates(this.select_device_custom, this.select_device);
        //add select_device_custom to select_device
        this.select_device = this.select_device_custom.concat(this.select_device);
      },
      err => console.error(err),
      () => console.log('DONE')
      );
    }
  }

  getDeviceItemByAlertId(alert_id) {
    if (alert_id.length > 0) {
      this.devicestatService.getDeviceItemByAlertId(alert_id)
      .subscribe(
      data => {
        this.select_device = [];
        this.select_device = this.createMultiselectArray(data);
        //remove from select_device_custom items with id in select_device
        this.select_device_custom = this.removeDuplicates(this.select_device_custom, this.select_device);
        //add select_device_custom to select_device
        this.select_device = this.select_device_custom.concat(this.select_device);
      },
      err => console.error(err),
      () => console.log('DONE')
      );
    }
  }

  setInitValues() {
    this.select_product = this.setSelectInitValues(this.sampleComponentForm.value.ProductID, this.select_product);
    this.select_baseline = this.setSelectInitValues(this.sampleComponentForm.value.BaseLine, this.select_baseline);
    this.select_alert = this.setSelectInitValues(this.sampleComponentForm.value.AlertID, this.select_alert);
    this.select_device = this.setSelectInitValues(this.sampleComponentForm.value.DeviceID, this.select_device);
    this.select_tag = this.setSelectInitValues(this.sampleComponentForm.value.FilterTagKey, this.select_tag);
    if (this.select_product.length > 0) this.select_product_custom = this.select_product.filter(item => item.extraData==='Custom Item');
    if (this.select_baseline.length > 0) this.select_baseline_custom = this.select_baseline.filter(item => item.extraData==='Custom Item');
    if (this.select_alert.length > 0) this.select_alert_custom = this.select_alert.filter(item => item.extraData==='Custom Item');
    if (this.select_device.length > 0) this.select_device_custom = this.select_device.filter(item => item.extraData==='Custom Item');
    if (this.select_tag.length > 0) this.select_tag_custom = this.select_tag.filter(item => item.extraData==='Custom Item');
  }

  setSelectInitValues(initvalue, select_array) : any {
    let item_found_array = [];
    if (select_array.length > 0) {
      item_found_array = select_array.filter(item => item.id===initvalue);
    }
    if (item_found_array.length == 0) {
      //initvalue not found, then this is a custom item. Add it to select_array
      let inititem = this.createCustomItem(initvalue);
      let initarray = [];
      initarray.push(inititem);
      select_array = initarray.concat(select_array);
    }
    return select_array;
  }

  createMultiselectArray(tempArray, ID?, Name?, extraData?) : any {
    let myarray = [];
    if(tempArray){
      for (let entry of tempArray) {
        let item = this.createArrayItem(entry, ID, Name, extraData);
        myarray.push(item);
      }
    }
    return myarray;
  }

  createArrayItem(entry, ID?, Name?, extraData?) : any {
    let item = { 'id': ID ? entry[ID] : entry, 'name': Name ? entry[Name] : entry, 'extraData': extraData ? entry[extraData] : null };
    return item;
  }

  createCustomItem(entry) : any {
    let item = { 'id': entry, 'name': entry, 'extraData': 'Custom Item' };
    return item;
  }

  //if array_to_search has items
  //for each item of array_to_clean get item.id
  //use filter to check if an item with this id is found on array_to_search
  //if no item is found, add item from array_to_clean into cleaned_array
  removeDuplicates(array_to_clean, array_to_search) : any {
    let cleaned_array = array_to_clean;
    if (array_to_search.length > 0) {
      cleaned_array = [];
      let found_array = [];
      for (let item_to_clean of array_to_clean) {
        found_array = array_to_search.filter(item_to_search => item_to_search.id===item_to_clean.id);
        if (found_array.length == 0) {
          cleaned_array.push(item_to_clean);
        }
      }
    }
    return cleaned_array;
  }

}
