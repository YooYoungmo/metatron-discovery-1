import {AbstractComponent} from "../../../../common/component/abstract.component";
import {Component, ElementRef, EventEmitter, Injector, Input, Output} from "@angular/core";
import {CreateWorkbenchModelService} from "./service/create-workbench-model.service";
import * as _ from "lodash";
import {StringUtil} from "../../../../common/util/string.util";
import {CommonUtil} from "../../../../common/util/common.util";
import {WorkbenchService} from "../../../service/workbench.service";
import {Alert} from "../../../../common/util/alert.util";
import {WorkbenchConstant} from "../../../workbench.constant";
import {StorageService} from "../../../../data-storage/service/storage.service";
import {ExploreConstant} from "../../../../explore-data/constant/explore.constant";


@Component({
  selector: 'component-workbench-complete',
  templateUrl: 'create-workbench-complete.component.html'
})
export class CreateWorkbenchCompleteComponent extends AbstractComponent {

  @Input() readonly workspaceId: string;
  @Input() readonly folderId: string;
  @Input() readonly isAccessFromExplore: boolean;

  name: string;
  description: string;
  selectedConnection;

  isInvalidName: boolean;
  invalidNameMessage: string;
  isInvalidDescription: boolean;
  invalidDescriptionMessage: string;

  @Output() readonly closedPopup = new EventEmitter();
  @Output() readonly completed = new EventEmitter();
  @Output() readonly changeStep = new EventEmitter();

  // 생성자
  constructor(private createWorkbenchModelService: CreateWorkbenchModelService,
              private workbenchService: WorkbenchService,
              protected element: ElementRef,
              protected injector: Injector) {
    super(element, injector);
  }

  ngOnInit() {
    this._initView();
  }

  close(): void {
    this.closedPopup.emit();
  }

  prev(): void {
    if (!this.isAccessFromExplore) {
      this.changeStep.emit(WorkbenchConstant.CreateStep.SELECT);
    }
  }

  complete(): void {
    this._checkNameValidation();
    this._checkDescriptionValidation();
    if (this.isValid()) {
      this._createWorkbench();
    }
  }

  isValid(): boolean {
    return this.isInvalidName !== true && this.isInvalidDescription !== true;
  }

  isEmptyName(): boolean {
    return StringUtil.isEmpty(this.name);
  }

  isEmptyDescription(): boolean {
    return StringUtil.isEmpty(this.description);
  }

  isNotEmptySelectedConnectionDescription(): boolean {
    return StringUtil.isNotEmpty(this.selectedConnection.description);
  }

  isEnableUrl(): boolean {
    return StringUtil.isNotEmpty(this.selectedConnection.url);
  }

  getConvertedConnectionTypeLabel(implementor) {
    return StorageService.connectionTypeList.find(type => type.implementor === implementor).name;
  }

  onChangeNameValidation(value: string): void {
    this.name = value;
    this.createWorkbenchModelService.name = value;
    this.isInvalidName = undefined;
    this.createWorkbenchModelService.isInvalidName = undefined;
  }

  onChangeDescriptionValidation(value: string): void {
    this.description = value;
    this.createWorkbenchModelService.description = value;
    this.isInvalidDescription = undefined;
    this.createWorkbenchModelService.isInvalidDescription = undefined;
  }

  private _isEmptyValue(value): boolean {
    return _.isNil(value);
  }

  private _isNotEmptyValue(value): boolean {
    return !this._isEmptyValue(value);
  }

  private _getCreateWorkbenchParams() {
    const params: {name: string, dataConnection: string, workspace: string, type: 'workbench', folderId?: string, description?: string} = {
      workspace: `/api/workspaces/${this.workspaceId}`,
      dataConnection: `/api/dataconnections/${this.selectedConnection.id}`,
      name: this.name.trim(),
      type: 'workbench'
    };
    // if not empty folder id
    if (this._isNotEmptyValue(this.folderId)) {
      params.folderId = this.folderId;
    }
    // if not empty description
    if (this._isNotEmptyValue(this.description)) {
      params.description = this.description.trim();
    }
    return params;
  }

  private _checkNameValidation(): void {
    // check empty
    if (this.isEmptyName()) {
      this.isInvalidName = true;
      this.invalidNameMessage = this.translateService.instant('msg.alert.edit.name.empty');
    } else if (CommonUtil.getByte(this.name) > 150) { // check length
      this.isInvalidName = true;
      this.invalidNameMessage = this.translateService.instant('msg.alert.edit.name.len');
    } else {
      this.isInvalidName = undefined;
    }
  }

  private _checkDescriptionValidation(): void {
    if (!this.isEmptyDescription() && CommonUtil.getByte(this.description) > 450) {
      this.isInvalidDescription = true;
      this.invalidDescriptionMessage = this.translateService.instant('msg.alert.edit.description.len');
    } else {
      this.isInvalidDescription = undefined;
    }
  }

  private _createWorkbench(): void {
    if (this.isAccessFromExplore) { // used in explore
      // #2132 생성은 개인워크스페이스로 이동해서 생성
      const params: {name: string, id: string, type: 'workbench', description?: string, table?: string} = {
        type: 'workbench',
        id: this.selectedConnection.id,
        name: this.name.trim(),
        table: this.selectedConnection.id
      };
      // if not empty description
      if (this._isNotEmptyValue(this.description)) {
        params.description = this.description.trim();
      }
      // set connection id and table in session storage
      sessionStorage.setItem(ExploreConstant.SessionStorageKey.CREATED_FROM_EXPLORE, JSON.stringify(params));
      this.completed.emit();
      // close
      this.close();
    } else {  // used in workspace
      this.loadingShow();
      this.workbenchService.createWorkbench(this._getCreateWorkbenchParams())
        .then(result => {
          this.loadingHide();
          Alert.success(`'${this.name}' ` + this.translateService.instant('msg.space.alert.workbench.create.success'));
          this.completed.emit(result.id);
          // close
          this.close();
        })
        .catch(error => this.commonExceptionHandler(error));
    }
  }

  private _initView(): void {
    this.selectedConnection = this.createWorkbenchModelService.selectedConnection;
    // if not empty data in model service
    if (this._isNotEmptyValue(this.createWorkbenchModelService.name)) {
      this.name = this.createWorkbenchModelService.name;
    }
    if (this._isNotEmptyValue(this.createWorkbenchModelService.description)) {
      this.description = this.createWorkbenchModelService.description;
    }
  }
}
