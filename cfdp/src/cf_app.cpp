#include <nan.h>
#include <fstream>
#include <string>
#include <stdarg.h>
#include "cf_app.h"



std::string GetStdString(v8::Local<v8::String> str)
{
	v8::String::Utf8Value temp(str->ToString());
	return(std::string(*temp));
}

void SetCallbackData(CallbackData * cd, Isolate * isolate, v8::Local<v8::Value> val)
{
	v8::HandleScope handleScope(isolate);
	cd->Function.Reset(isolate,val.As<Function>());
	cd->IsDefined = true;
}

void LogInfoSignal(char * buf)
{
	isolate = Isolate::GetCurrent();
	v8::HandleScope handleScope(isolate);

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(buf);
	argv[0] = v8::String::NewFromUtf8(isolate, str.c_str());

	Local<Function> Func = Local<Function>::New(isolate, LogInfo.Function);

	if(LogInfo.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
	}

}

void LogDebugSignal(char *buf)
{
	isolate = Isolate::GetCurrent();
	v8::HandleScope handleScope(isolate);

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(buf);
	argv[0] = v8::String::NewFromUtf8(isolate, str.c_str());

	Local<Function> Func = Local<Function>::New(isolate, LogDebug.Function);

	if(LogInfo.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
	}

}

void LogWarningSignal(char *buf)
{
	isolate = Isolate::GetCurrent();
	v8::HandleScope handleScope(isolate);

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(buf);
	argv[0] = v8::String::NewFromUtf8(isolate, str.c_str());

	Local<Function> Func = Local<Function>::New(isolate, LogWarning.Function);

	if(LogInfo.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
	}

}

void LogErrorSignal(char *buf)
{
	isolate = Isolate::GetCurrent();
	v8::HandleScope handleScope(isolate);

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(buf);
	argv[0] = v8::String::NewFromUtf8(isolate, str.c_str());

	Local<Function> Func = Local<Function>::New(isolate, LogError.Function);

	if(LogInfo.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
	}

}

void IsPduOutputOpenCb()
{
	isolate = Isolate::GetCurrent();
    v8::HandleScope handleScope(isolate);

	v8::Local<Object> obj = v8::Object::New(isolate);

	obj->Set(v8::String::NewFromUtf8(isolate, "srcLength"),v8::Number::New(isolate, isPduOpenPacket.srcid.length));
	obj->Set(v8::String::NewFromUtf8(isolate, "dstLength"),v8::Number::New(isolate, isPduOpenPacket.destid.length));

	v8::Local<Array> Outval1 = v8::Array::New(isolate,isPduOpenPacket.srcid.length);
	v8::Local<Array> Outval2 = v8::Array::New(isolate,isPduOpenPacket.destid.length);

    int i;

	for( i = 0; i < isPduOpenPacket.srcid.length; i++)
	{
		v8::Local<v8::Value> elm = v8::Number::New(isolate,isPduOpenPacket.srcid.value[i]);
		Outval1->Set(i, elm);
	}

	for( i = 0; i < isPduOpenPacket.destid.length; i++)
	{
		v8::Local<v8::Value> elm = v8::Number::New(isolate,isPduOpenPacket.destid.value[i]);
		Outval2->Set(i, elm);
	}

	obj->Set(v8::String::NewFromUtf8(isolate, "srcValue"),Outval1);
	obj->Set(v8::String::NewFromUtf8(isolate, "dstValue"),Outval2);


	const int argc = 1;

	v8::Local<v8::Value> argv[argc];

	argv[0] = obj;

	Local<Function> Func = Local<Function>::New(isolate, pduOutputOpen.Function);

	if(pduOutputOpen.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);

	}
}

void SendPduOutputCb()
{
	isolate = Isolate::GetCurrent();
	v8::HandleScope handleScope(isolate);

	v8::Local<Object> obj = v8::Object::New(isolate);

	const int argc = 1;

	v8::Local<v8::Value> argv[argc];


	// argv[0] = Nan::NewBuffer((unsigned char*)pduSendPacket.pduptr->content, (unsigned char*)pduSendPacket.pduptr->length).ToLocalChecked();

	v8::Local<Array> Outval = v8::Array::New(isolate, pduSendPacket.pduptr->length);

	int i;

	for( i = 0; i < pduSendPacket.pduptr->length; i++)
	{
		v8::Local<v8::Value> elm = v8::Number::New(isolate,pduSendPacket.pduptr->content[i]);
		Outval->Set(i, elm);
	}

	obj->Set(v8::String::NewFromUtf8(isolate, "pdu"),Outval);
	obj->Set(v8::String::NewFromUtf8(isolate, "length"),v8::Number::New(isolate, pduSendPacket.pduptr->length));



	argv[0] = obj;

	Local<Function> Func = Local<Function>::New(isolate, PduOutputSend.Function);

	if(PduOutputSend.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);

	}
}

void isPduOutputReadyCb()
{

	isolate = Isolate::GetCurrent();
	v8::HandleScope handleScope(isolate);

	v8::Local<Object> obj = v8::Object::New(isolate);

	obj->Set(v8::String::NewFromUtf8(isolate, "pduType"),v8::String::NewFromUtf8(isolate, PduTypeEMap[isPduReadyPacket.ptype]));

	obj->Set(v8::String::NewFromUtf8(isolate, "transSrcLength"),v8::Number::New(isolate, isPduReadyPacket.tinfo.source_id.length));
	obj->Set(v8::String::NewFromUtf8(isolate, "dstLength"),v8::Number::New(isolate, isPduReadyPacket.destid.length));

	v8::Local<Array> Outval1 = v8::Array::New(isolate,isPduReadyPacket.tinfo.source_id.length);
	v8::Local<Array> Outval2 = v8::Array::New(isolate,isPduReadyPacket.destid.length);

	int i;

	for( i = 0; i < isPduReadyPacket.tinfo.source_id.length; i++)
	{
		v8::Local<v8::Value> elm = v8::Number::New(isolate,isPduReadyPacket.tinfo.source_id.value[i]);
		Outval1->Set(i, elm);
	}

	for( i = 0; i < isPduReadyPacket.destid.length; i++)
	{
		v8::Local<v8::Value> elm = v8::Number::New(isolate,isPduReadyPacket.destid.value[i]);
		Outval2->Set(i, elm);
	}

	obj->Set(v8::String::NewFromUtf8(isolate, "transSrcValue"),Outval1);
	obj->Set(v8::String::NewFromUtf8(isolate, "dstValue"),Outval2);

	const int argc = 1;

	v8::Local<v8::Value> argv[argc];

	argv[0] = obj;

	Local<Function> Func = Local<Function>::New(isolate, pduOutputReady.Function);
	Local<Context> 	context = 	isolate->GetCurrentContext();
	Local<Object> 	global = 	context->Global();


	if(pduOutputReady.IsDefined)
	{

		Func->Call(global, argc, argv);

	}
}

void IndicationCb()
{
	isolate = Isolate::GetCurrent();
	v8::HandleScope handleScope(isolate);

	v8::Local<v8::Object> mdObj = v8::Object::New(isolate);

	mdObj->Set(v8::String::NewFromUtf8(isolate, "file_transfer"),v8::Boolean::New(isolate, indicationPacket.tinfo.md.file_transfer));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "segmentation_control"),v8::Boolean::New(isolate, indicationPacket.tinfo.md.segmentation_control));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "file_size"),v8::Number::New(isolate, indicationPacket.tinfo.md.file_size));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "source_file_name"),v8::String::NewFromUtf8(isolate, indicationPacket.tinfo.md.source_file_name));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "dest_file_name"),v8::String::NewFromUtf8(isolate, indicationPacket.tinfo.md.dest_file_name));

	v8::Local<Object> patnerIdObj = v8::Object::New(isolate);
	v8::Local<Array> partner_id_val = v8::Array::New(isolate,indicationPacket.tinfo.partner_id.length);

	int i;

	for( i = 0; i < indicationPacket.tinfo.partner_id.length; i++)
	{
		v8::Local<v8::Value> elm = v8::Number::New(isolate,indicationPacket.tinfo.partner_id.value[i]);
		partner_id_val->Set(i, elm);
	}

	patnerIdObj->Set(v8::String::NewFromUtf8(isolate, "value"),partner_id_val);
	patnerIdObj->Set(v8::String::NewFromUtf8(isolate, "length"),v8::Number::New(isolate, indicationPacket.tinfo.partner_id.length));

	Local<Object> obj = Nan::New<Object>();

	obj->Set(v8::String::NewFromUtf8(isolate, "IndType"),v8::String::NewFromUtf8(isolate, IndicationType[indicationPacket.indtype]));
	obj->Set(v8::String::NewFromUtf8(isolate, "abandoned"),v8::Boolean::New(isolate, indicationPacket.tinfo.abandoned));
	obj->Set(v8::String::NewFromUtf8(isolate, "attempts"),v8::Number::New(isolate, indicationPacket.tinfo.attempts));
	obj->Set(v8::String::NewFromUtf8(isolate, "cancelled"),v8::Boolean::New(isolate, indicationPacket.tinfo.cancelled));
	obj->Set(v8::String::NewFromUtf8(isolate, "external_file_xfer"),v8::Boolean::New(isolate, indicationPacket.tinfo.external_file_xfer));
	obj->Set(v8::String::NewFromUtf8(isolate, "fd_offset"),v8::Number::New(isolate, indicationPacket.tinfo.fd_offset));
	obj->Set(v8::String::NewFromUtf8(isolate, "fd_length"),v8::Number::New(isolate, indicationPacket.tinfo.fd_length));
	obj->Set(v8::String::NewFromUtf8(isolate, "file_checksum_as_calculated"),v8::Number::New(isolate, indicationPacket.tinfo.file_checksum_as_calculated));
	obj->Set(v8::String::NewFromUtf8(isolate, "finished"),v8::Boolean::New(isolate, indicationPacket.tinfo.finished));
	obj->Set(v8::String::NewFromUtf8(isolate, "frozen"),v8::Boolean::New(isolate, indicationPacket.tinfo.frozen));
	obj->Set(v8::String::NewFromUtf8(isolate, "has_md_been_received"),v8::Boolean::New(isolate, indicationPacket.tinfo.has_md_been_received));
	obj->Set(v8::String::NewFromUtf8(isolate, "how_many_naks"),v8::Number::New(isolate, indicationPacket.tinfo.how_many_naks));
	obj->Set(v8::String::NewFromUtf8(isolate, "is_this_trans_solely_for_ack_fin"),v8::Boolean::New(isolate, indicationPacket.tinfo.is_this_trans_solely_for_ack_fin));
	obj->Set(v8::String::NewFromUtf8(isolate, "phase"),v8::Number::New(isolate, indicationPacket.tinfo.phase));
	obj->Set(v8::String::NewFromUtf8(isolate, "received_file_size"),v8::Number::New(isolate, indicationPacket.tinfo.received_file_size));
	obj->Set(v8::String::NewFromUtf8(isolate, "start_time"),v8::Number::New(isolate, indicationPacket.tinfo.start_time));
	obj->Set(v8::String::NewFromUtf8(isolate, "suspended"),v8::Boolean::New(isolate, indicationPacket.tinfo.suspended));
	obj->Set(v8::String::NewFromUtf8(isolate, "temp_file_name"),v8::String::NewFromUtf8(isolate, indicationPacket.tinfo.temp_file_name));
	obj->Set(v8::String::NewFromUtf8(isolate, "condition_code"),v8::String::NewFromUtf8(isolate, ConditionCode[indicationPacket.tinfo.condition_code]));
	obj->Set(v8::String::NewFromUtf8(isolate, "delivery_code"),v8::String::NewFromUtf8(isolate, DeliveryCode[indicationPacket.tinfo.delivery_code]));
	obj->Set(v8::String::NewFromUtf8(isolate, "final_status"),v8::String::NewFromUtf8(isolate, FinalStatus[indicationPacket.tinfo.final_status]));
	obj->Set(v8::String::NewFromUtf8(isolate, "role"),v8::String::NewFromUtf8(isolate, Role[indicationPacket.tinfo.role]));
	obj->Set(v8::String::NewFromUtf8(isolate, "state"),v8::String::NewFromUtf8(isolate, State[indicationPacket.tinfo.state]));

	obj->Set(v8::String::NewFromUtf8(isolate, "md"),mdObj);
	obj->Set(v8::String::NewFromUtf8(isolate, "partner_id"),patnerIdObj);

	const int argc = 1;

	v8::Local<v8::Value> argv[argc];

	argv[0] = obj;

	Local<Function> Func = Local<Function>::New(isolate, IndicationHandle.Function);

	if(IndicationHandle.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);

	}
}

void AsyncEventCapture(uv_async_t *handle) {

	CF_MTCB signal = *((CF_MTCB*) handle->data);

	switch(signal)
	{
		case IS_PDU_OPEN_CB:
		{
			IsPduOutputOpenCb();
			break;
		}
		case IS_PDU_READY_CB:
		{
			isPduOutputReadyCb();
			break;
		}
		case PDU_SEND_CB:
		{
			SendPduOutputCb();
			break;
		}
		case INDICATION_CB:
		{
			IndicationCb();
			break;
		}
		case UNDEFINED_CB:
		{
			InfoEvent("EVT_%d | Undefined Event ", ASYNC_EVT_CAPTURE );
			break;
		}
		default:
		{
			Log log = *((Log*) handle->data);

			switch(log.signal){
				case LOG_INFO_CB:
				{
					LogInfoSignal(log.BigBufPtr);
					break;
				}
				case LOG_DEBUG_CB:
				{
					LogDebugSignal(log.BigBufPtr);
					break;
				}
				case LOG_WARNING_CB:
				{
					LogWarningSignal(log.BigBufPtr);
					break;
				}
				case LOG_ERROR_CB:
				{
					LogErrorSignal(log.BigBufPtr);
					break;
				}
				default:
				{
					ErrorEvent("EVT_%d | Logging Error", ASYNC_EVT_CAPTURE );
					break;
				}
			}
			break;
		}
	}
	/* Release semaphore */
	uv_sem_post( &sem);
}

void CycleWorker(uv_work_t * request)
{
	while(!ShutdownTransCycle){
		sleep(1);
		cfdp_cycle_each_transaction();
	}
}

void CycleShutdown(uv_work_t * request)
{
	uv_sem_destroy( &sem);
}

void StartCycle(const FunctionCallbackInfo<Value> &args)
{
	loop = uv_default_loop();

	Worker * worker = new Worker();
	worker->request.data = worker;

	ShutdownTransCycle = false;

	InfoEvent("EVT_%d | Cycling CFDP engine", TRANS_CYCLE );

	uv_async_init(loop, &async, AsyncEventCapture);
	uv_queue_work(loop,&worker->request,CycleWorker,CycleShutdown);
	uv_sem_init(&sem, 0);

}

void StopCycle(const FunctionCallbackInfo<Value> &args)
{
	InfoEvent("EVT_%d | Transaction cycle is called for shutdown", TRANS_CYCLE );
	ShutdownTransCycle = true;
}

int InfoEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        i;

    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    if( (async.loop != 0) & (Isolate::GetCurrent() == 0) )
	{
    	Log info;
    	info.BigBufPtr = (char *)&BigBuf;
    	info.signal = LOG_INFO_CB;
	    async.data = (void*) &info;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else{
		LogInfoSignal((char *)&BigBuf);
	}

    return(0);
}

int ErrorEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        i;

    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    if( (async.loop != 0) & (Isolate::GetCurrent() == 0) )
	{
    	Log info;
    	info.BigBufPtr = (char *)&BigBuf;
    	info.signal = LOG_ERROR_CB;
	    async.data = (void*) &info;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else{
		LogErrorSignal((char *)&BigBuf);
	}


    return(0);
}

int DebugEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        i;

    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    if( (async.loop != 0) & (Isolate::GetCurrent() == 0) )
	{
    	Log info;
    	info.BigBufPtr = (char *)&BigBuf;
    	info.signal = LOG_DEBUG_CB;
	    async.data = (void*) &info;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else{
		LogDebugSignal((char *)&BigBuf);
	}

    return(0);
}

int WarningEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        i;

    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    if( (async.loop != 0) & (Isolate::GetCurrent() == 0) )
	{
    	Log info;
    	info.BigBufPtr = (char *)&BigBuf;
    	info.signal = LOG_WARNING_CB;
	    async.data = (void*) &info;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else
	{
		LogWarningSignal((char *)&BigBuf);
	}

    return(0);
}

void Indication (INDICATION_TYPE IndType, TRANS_STATUS TransInfo)
{

	memset(&indicationPacket, 0, sizeof(indicationPacket));
	indicationPacket.indtype = IndType;
	memcpy(&indicationPacket.tinfo, &TransInfo, sizeof(TransInfo));

	if( (async.loop != 0) & (Isolate::GetCurrent() == 0) )
	{
		CF_MTCB signal = INDICATION_CB;
	    async.data = (void*) &signal;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else
	{
		IndicationCb();
	}

}

boolean IsPduOutputOpen (ID SourceId, ID DestinationId)
{

	memset(&isPduOpenPacket, 0, sizeof(isPduReadyPacket));
	memcpy(&isPduOpenPacket.srcid, &SourceId, sizeof(SourceId));
	memcpy(&isPduOpenPacket.destid, &DestinationId, sizeof(DestinationId));

	if( (async.loop != 0) & (Isolate::GetCurrent() == 0) )
	{
		CF_MTCB signal = IS_PDU_OPEN_CB;
	    async.data = (void*) &signal;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else
	{
		IsPduOutputOpenCb();
	}



	return (YES);
}

boolean isPduOutputReady (PDU_TYPE PduType, TRANSACTION TransInfo,ID DestinationId)
{

	memset(&isPduReadyPacket, 0, sizeof(isPduReadyPacket));
	memcpy(&isPduReadyPacket.ptype, &PduType, sizeof(PduType));
	memcpy(&isPduReadyPacket.tinfo, &TransInfo, sizeof(TransInfo));
	memcpy(&isPduReadyPacket.destid, &DestinationId, sizeof(DestinationId));

	if( (async.loop != 0) & (Isolate::GetCurrent() == 0) )
	{
		CF_MTCB signal = IS_PDU_READY_CB;
	    async.data = (void*) &signal;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);

	}
	else
	{
		isPduOutputReadyCb();
	}

	return (YES);
}

void SendPduOutput (TRANSACTION TransInfo,ID DestinationId, CFDP_DATA *PduPtr)
{

	memset(&pduSendPacket, 0, sizeof(pduSendPacket));
	memcpy(&pduSendPacket.tinfo, &TransInfo, sizeof(TransInfo));
	memcpy(&pduSendPacket.destid, &DestinationId, sizeof(DestinationId));
	pduSendPacket.pduptr = PduPtr;

	if( (async.loop != 0) & (Isolate::GetCurrent() == 0) )
	{
		CF_MTCB signal = PDU_SEND_CB;
	    async.data = (void*) &signal;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else
	{
		SendPduOutputCb();
	}

}

int32_t Seek(int32_t  filedes, int32_t offset, uint32_t whence)
{
    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }
    return (fseek((uint32_t)filedes,offset,whence));
}

CF_FILE * FileOpen(const char *Name, const char *Mode)
{
	FILE	*	fileHandle;
	char 		temp[CF_MAX_PATH_LEN];
	memset(&temp,'\0',sizeof(temp));


	if ( *Name != '/' ){
		strncpy(temp, TempStorageBaseDir, CF_MAX_PATH_LEN);
	}

	strncat(temp, Name, CF_MAX_PATH_LEN);

	fileHandle = fopen(temp, Mode);
	return fileHandle;
}

size_t FileRead(void *Buffer, size_t Size,size_t Count, CF_FILE *File)
{
	size_t out_size = fread(Buffer, Size, Count, File);
	return out_size;
}

size_t FileWrite(const void *Buffer, size_t Size,size_t Count, CF_FILE *File)
{
	size_t out_size = fwrite(Buffer, Size, Count, File);
	return out_size;
}

int FileClose(CF_FILE *File)
{
	return fclose(File);
}

int FileSeek(CF_FILE *File, long int Offset, int Whence)
{
    int     	ReturnVal;
    uint16_t  	WhenceVal;
    int32_t   	SeekVal;

    WhenceVal = 0;
    ReturnVal = OS_SUCCESS;

    if(Whence == SEEK_SET)
    {
        WhenceVal = OS_SEEK_SET;
    }
    else if(Whence == SEEK_CUR)
    {
        WhenceVal = OS_SEEK_CUR;
    }
    else if(Whence == SEEK_END)
    {
        WhenceVal = OS_SEEK_END;
    }

    SeekVal = Seek((int32_t)File,(int32_t)Offset,WhenceVal);

    if(SeekVal == OS_ERROR)
    {
        ReturnVal = 1;
    }
    else
    {
        ReturnVal = OS_SUCCESS;
    }

    return(ReturnVal);
}

int RemoveFile(const char *Name)
{
	char temp[CF_MAX_PATH_LEN];
	memset(&temp,'\0',sizeof(temp));

	/* if Name is a file name, not path name or did not start with `/` */
	if ( *Name != '/' ){
		strncpy(temp, TempStorageBaseDir, CF_MAX_PATH_LEN);
	}
	strncat(temp, Name, CF_MAX_PATH_LEN);
	return remove(temp);
}

int RenameFile(const char *TempFileName, const char *NewName)
{
	char tempOld[CF_MAX_PATH_LEN];
	char tempNew[CF_MAX_PATH_LEN];
	memset(&tempOld,'\0',sizeof(tempOld));
	memset(&tempNew,'\0',sizeof(tempNew));

	strncpy(tempOld, TempStorageBaseDir, CF_MAX_PATH_LEN);

	strncat(tempOld, TempFileName, CF_MAX_PATH_LEN);

	strncpy(tempNew, NewName, CF_MAX_PATH_LEN);

	return rename(tempOld, tempNew);
}

u_int_4 FileSize(const char *Name)
{
	struct stat st;
	char temp[CF_MAX_PATH_LEN];
	memset(&temp,'\0',sizeof(temp));

	/* if Name is a file name, not path name or did not start with `/` */
	if ( *Name != '/' ){
		strncpy(temp, TempStorageBaseDir, CF_MAX_PATH_LEN);
	}

	strncat(temp, Name, CF_MAX_PATH_LEN);
	stat(temp, &st);
	return st.st_size;
}

void GivePdu(const FunctionCallbackInfo<Value> &args)
{

	Isolate* isolate = args.GetIsolate();
	v8::HandleScope handleScope(isolate);

	if(args.Length() < 1 || !args[0]->IsObject()) {
		ErrorEvent("EVT_%d | Invalid arguments, expected [ByteBuffer<Object>, ByteBufferLength<Number>]", GIVE_PDU);
	    return;
	}

	unsigned char* 	buffer 	= (unsigned char*) node::Buffer::Data(args[0]->ToObject());

	memset(&RawPduInputBuf.content[0], 0, sizeof(RawPduInputBuf));

	RawPduInputBuf.length = args[1]->Uint32Value();

	memcpy(&RawPduInputBuf.content[0], buffer, RawPduInputBuf.length);
	cfdp_give_pdu(RawPduInputBuf);
}

void RequestPdu(const FunctionCallbackInfo<Value> &args)
{
	char ReqString[MAX_REQUEST_STRING_LENGTH];

	if(args.Length() < 1 || args.Length() > 4
			|| !args[0]->IsNumber()
			|| !args[1]->IsString()
			|| !args[2]->IsString()
			|| !args[3]->IsString())
	{

		ErrorEvent("EVT_%d | Invalid arguments, expected [Class<Number>, PeerEntityId<String>, SrcFilename<String>, DstFilename<String>]", REQ_PDU);
		return;
	}

	std::string Class 			= GetStdString(args[0]->ToString());
	std::string PeerEntityId 	= GetStdString(args[1]->ToString());
	std::string SrcFilename 	= GetStdString(args[2]->ToString());
	std::string DstFilename 	= GetStdString(args[3]->ToString());

	strcpy(ReqString,"PUT ");
	strcat(ReqString,"-class");
	strcat(ReqString,Class.c_str());
	strcat(ReqString," ");
	strcat(&ReqString[0],SrcFilename.c_str());
	strcat(&ReqString[0]," ");
	strcat(&ReqString[0],PeerEntityId.c_str());
	strcat(&ReqString[0]," ");
	strcat(&ReqString[0],DstFilename.c_str());


	if(!cfdp_give_request(ReqString))
	{
        ErrorEvent("EVT_%d | Engine put request returned error for %s", REQ_PDU, SrcFilename.c_str());
	}
	else
	{
		InfoEvent("EVT_%d | Engine put request returned Success for %s", REQ_PDU, &ReqString);
	}

}

void GetSummaryStatus(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();
	v8::HandleScope handleScope(isolate);

	v8::Local<Object> obj = v8::Object::New(isolate);

	SUMMARY_STATUS Summary;

	Summary = cfdp_summary_status();

	obj->Set(v8::String::NewFromUtf8(isolate, "are_any_partners_frozen"),
			v8::Boolean::New(isolate, Summary.are_any_partners_frozen));
	obj->Set(v8::String::NewFromUtf8(isolate, "how_many_senders"),
			v8::Number::New(isolate, Summary.how_many_senders));
	obj->Set(v8::String::NewFromUtf8(isolate, "how_many_receivers"),
			v8::Number::New(isolate, Summary.how_many_receivers));
	obj->Set(v8::String::NewFromUtf8(isolate, "how_many_frozen"),
			v8::Number::New(isolate, Summary.how_many_frozen));
	obj->Set(v8::String::NewFromUtf8(isolate, "how_many_suspended"),
			v8::Number::New(isolate, Summary.are_any_partners_frozen));
	obj->Set(v8::String::NewFromUtf8(isolate, "total_files_sent"),
			v8::Number::New(isolate, Summary.how_many_senders));
	obj->Set(v8::String::NewFromUtf8(isolate, "total_files_received"),
			v8::Number::New(isolate, Summary.how_many_receivers));
	obj->Set(v8::String::NewFromUtf8(isolate, "total_unsuccessful_senders"),
			v8::Number::New(isolate, Summary.how_many_frozen));
	obj->Set(v8::String::NewFromUtf8(isolate, "total_unsuccessful_receivers"),
			v8::Number::New(isolate, Summary.how_many_receivers));

	args.GetReturnValue().Set(obj);

}

void GetIdFromString(const FunctionCallbackInfo<Value> &args)
{


	Isolate* isolate = args.GetIsolate();
	v8::HandleScope handleScope(isolate);

	ID OutId;
	v8::Local<Object> obj = v8::Object::New(isolate);

	std::string DottedValString = GetStdString(args[0]->ToString());

	if( !cfdp_id_from_string(DottedValString.c_str(), &OutId) )
	{
		ErrorEvent("EVT_%d | ID cannot be retrieved for (%s)", GET_ID_TO_STR, DottedValString.c_str());
		return;
	}

	obj->Set(v8::String::NewFromUtf8(isolate, "length"),v8::Number::New(isolate, OutId.length));
	v8::Local<Array> Outval = v8::Array::New(isolate,OutId.length);

	int i;
	for( i = 0; i < OutId.length; i++)
	{
		v8::Local<v8::Value> elm = v8::Number::New(isolate,OutId.value[i]);
		Outval->Set(i, elm);
	}

	obj->Set(v8::String::NewFromUtf8(isolate, "value"),Outval);
	args.GetReturnValue().Set(obj);

}

void GetTransactionStatus(const FunctionCallbackInfo<Value> &args)
{
	TRANSACTION Trans;

	if(args.Length() < 1
			|| args.Length() > 3
			|| !args[0]->IsNumber()
			|| !args[1]->IsNumber()
			|| !args[2]->IsObject()) {

		ErrorEvent("EVT_%d | Invalid arguments, expected [TransactionNumber<Number>, TransactionSourceIdLength<Number>, TransactionSourceIdValueBuffer<Object>]", GET_TRANS_STATUS);
		return;

	}

	Trans.number 			= args[0]->NumberValue();
	Trans.source_id.length 	= args[1]->NumberValue();

	unsigned char* 	buffer 	= (unsigned char*) node::Buffer::Data(args[2]->ToObject());

	memset(&Trans.source_id.value[0], 0, sizeof(Trans.source_id.value));
	memcpy(&Trans.source_id.value[0], buffer, Trans.source_id.length);

	boolean Status = cfdp_transaction_status(Trans, &ts_q);
	if( !Status )
	{
		ErrorEvent("EVT_%d | Transaction status cannot be retrieved for Transaction # %d", GET_TRANS_STATUS, Trans.number);
		return;
	}

	TransStatusCallback();



}

void TransStatusCallback()
{

	if( !TransactionStatusHandle.IsDefined )
	{
		ErrorEvent("EVT_%d | `showTransactionStatus` callback was not registered.", SET_CALLBACK);
		return;
	}

	Isolate* isolate = Isolate::GetCurrent();
	v8::HandleScope handleScope(isolate);

	const int 				argc 			= 1;
	v8::Local<v8::Value> 	argv[argc];

	v8::Local<v8::Object> 	mdObj 			= v8::Object::New(isolate);
	v8::Local<v8::Object> 	patnerIdObj 	= v8::Object::New(isolate);
	v8::Local<v8::Object> 	obj 			= Nan::New<Object>();
	v8::Local<v8::Array> 	partner_id_val 	= v8::Array::New(isolate,ts_q.partner_id.length);
	v8::Local<v8::Function> Func 			= Local<Function>::New(isolate, TransactionStatusHandle.Function);


	mdObj->Set(v8::String::NewFromUtf8(isolate, "file_transfer"),v8::Boolean::New(isolate, ts_q.md.file_transfer));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "segmentation_control"),v8::Boolean::New(isolate, ts_q.md.segmentation_control));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "file_size"),v8::Number::New(isolate, ts_q.md.file_size));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "source_file_name"),v8::String::NewFromUtf8(isolate, ts_q.md.source_file_name));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "dest_file_name"),v8::String::NewFromUtf8(isolate, ts_q.md.dest_file_name));


    int 					i;
	for( i = 0; i < ts_q.partner_id.length; i++ )
	{
		v8::Local<v8::Value> elm = v8::Number::New(isolate,ts_q.partner_id.value[i]);
		partner_id_val->Set(i, elm);
	}
	patnerIdObj->Set(v8::String::NewFromUtf8(isolate, "value"),partner_id_val);
	patnerIdObj->Set(v8::String::NewFromUtf8(isolate, "length"),v8::Number::New(isolate, ts_q.partner_id.length));


	obj->Set(v8::String::NewFromUtf8(isolate, "abandoned"),v8::Boolean::New(isolate, ts_q.abandoned));
	obj->Set(v8::String::NewFromUtf8(isolate, "attempts"),v8::Number::New(isolate, ts_q.attempts));
	obj->Set(v8::String::NewFromUtf8(isolate, "cancelled"),v8::Boolean::New(isolate, ts_q.cancelled));
	obj->Set(v8::String::NewFromUtf8(isolate, "external_file_xfer"),v8::Boolean::New(isolate, ts_q.external_file_xfer));
	obj->Set(v8::String::NewFromUtf8(isolate, "fd_offset"),v8::Number::New(isolate, ts_q.fd_offset));
	obj->Set(v8::String::NewFromUtf8(isolate, "fd_length"),v8::Number::New(isolate, ts_q.fd_length));
	obj->Set(v8::String::NewFromUtf8(isolate, "file_checksum_as_calculated"),v8::Number::New(isolate, ts_q.file_checksum_as_calculated));
	obj->Set(v8::String::NewFromUtf8(isolate, "finished"),v8::Boolean::New(isolate, ts_q.finished));
	obj->Set(v8::String::NewFromUtf8(isolate, "frozen"),v8::Boolean::New(isolate, ts_q.frozen));
	obj->Set(v8::String::NewFromUtf8(isolate, "has_md_been_received"),v8::Boolean::New(isolate, ts_q.has_md_been_received));
	obj->Set(v8::String::NewFromUtf8(isolate, "how_many_naks"),v8::Number::New(isolate, ts_q.how_many_naks));
	obj->Set(v8::String::NewFromUtf8(isolate, "is_this_trans_solely_for_ack_fin"),v8::Boolean::New(isolate, ts_q.is_this_trans_solely_for_ack_fin));
	obj->Set(v8::String::NewFromUtf8(isolate, "phase"),v8::Number::New(isolate, ts_q.phase));
	obj->Set(v8::String::NewFromUtf8(isolate, "received_file_size"),v8::Number::New(isolate, ts_q.received_file_size));
	obj->Set(v8::String::NewFromUtf8(isolate, "start_time"),v8::Number::New(isolate, ts_q.start_time));
	obj->Set(v8::String::NewFromUtf8(isolate, "suspended"),v8::Boolean::New(isolate, ts_q.suspended));
	obj->Set(v8::String::NewFromUtf8(isolate, "temp_file_name"),v8::String::NewFromUtf8(isolate, ts_q.temp_file_name));
	obj->Set(v8::String::NewFromUtf8(isolate, "condition_code"),v8::String::NewFromUtf8(isolate, ConditionCode[ts_q.condition_code]));
	obj->Set(v8::String::NewFromUtf8(isolate, "delivery_code"),v8::String::NewFromUtf8(isolate, DeliveryCode[ts_q.delivery_code]));
	obj->Set(v8::String::NewFromUtf8(isolate, "final_status"),v8::String::NewFromUtf8(isolate, FinalStatus[ts_q.final_status]));
	obj->Set(v8::String::NewFromUtf8(isolate, "role"),v8::String::NewFromUtf8(isolate, Role[ts_q.role]));
	obj->Set(v8::String::NewFromUtf8(isolate, "state"),v8::String::NewFromUtf8(isolate, State[ts_q.state]));

	obj->Set(v8::String::NewFromUtf8(isolate, "md"),mdObj);
	obj->Set(v8::String::NewFromUtf8(isolate, "partner_id"),patnerIdObj);

	argv[0] = obj;

	if(TransactionStatusHandle.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
	}

}

uint8_t ValidateRequiredCbRegistration(){

	uint8_t Status = CF_SUCCESS;

	if( !LogInfo.IsDefined )
	{
		ErrorEvent("EVT_%d | `info` callback was not registered.", SET_CALLBACK);
		Status = CF_FAIL;
	}

	if( !LogError.IsDefined )
	{
		ErrorEvent("EVT_%d | `error` callback was not registered.", SET_CALLBACK);
		Status = CF_FAIL;
	}

	if( !LogDebug.IsDefined )
	{
		ErrorEvent("EVT_%d | `debug` callback was not registered.", SET_CALLBACK);
		Status = CF_FAIL;
	}

	if( !LogWarning.IsDefined )
	{
		ErrorEvent("EVT_%d | `warning` callback was not registered.", SET_CALLBACK);
		Status = CF_FAIL;
	}

	if( !pduOutputOpen.IsDefined )
	{
		ErrorEvent("EVT_%d | `pduOutputOpen` callback was not registered.", SET_CALLBACK);
		Status = CF_FAIL;
	}

	if( !pduOutputReady.IsDefined )
	{
		ErrorEvent("EVT_%d | `pduOutputReady` callback was not registered.", SET_CALLBACK);
		Status = CF_FAIL;
	}

	if( !PduOutputSend.IsDefined )
	{
		ErrorEvent("EVT_%d | `pduOutputSend` callback was not registered.", SET_CALLBACK);
		Status = CF_FAIL;
	}

	if( !IndicationHandle.IsDefined )
	{
		ErrorEvent("EVT_%d | `indication` callback was not registered.", SET_CALLBACK);
		Status = CF_FAIL;
	}

	return Status;
}

void RegisterCallbacks(){

    register_indication (Indication);
    register_pdu_output_open (IsPduOutputOpen);
    register_pdu_output_ready (isPduOutputReady);
    register_pdu_output_send (SendPduOutput);
    register_printf_debug(DebugEvent);
    register_printf_info(InfoEvent);
    register_printf_warning(WarningEvent);
    register_printf_error(ErrorEvent);
    register_file_size(FileSize);
    register_rename(RenameFile);
    register_remove(RemoveFile);
    register_fseek(FileSeek);
    register_fopen(FileOpen);
    register_fread(FileRead);
    register_fwrite(FileWrite);
    register_fclose(FileClose);

}

void RegisterCallbackOn(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();
	v8::HandleScope handleScope(isolate);

	std::string indicator = GetStdString(args[0]->ToString());

	if(indicator == "info")
	{
		SetCallbackData(&LogInfo, isolate, args[1]);
	}
	else if(indicator == "debug")
	{
		SetCallbackData(&LogDebug, isolate, args[1]);
	}
	else if(indicator == "error")
	{
		SetCallbackData(&LogError, isolate, args[1]);
	}
	else if(indicator == "warning")
	{
		SetCallbackData(&LogWarning, isolate, args[1]);
	}
	else if(indicator == "pduOutputOpen")
	{
		SetCallbackData(&pduOutputOpen, isolate, args[1]);
	}
	else if(indicator == "pduOutputReady")
	{
		SetCallbackData(&pduOutputReady, isolate, args[1]);
	}
	else if(indicator == "pduOutputSend")
	{
		SetCallbackData(&PduOutputSend, isolate, args[1]);
	}
	else if(indicator == "indication")
	{
		SetCallbackData(&IndicationHandle, isolate, args[1]);
	}
	else if(indicator == "showTransactionStatus")
	{
		SetCallbackData(&TransactionStatusHandle, isolate, args[1]);
	}

}

void SetConfig(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();

	if(args.Length() < 1 || !args[0]->IsObject()) {

		ErrorEvent("Invalid arguments, expected [Configuration<Object>]");
	    return;

	}

	Local<Context> 	context = 	isolate->GetCurrentContext();
	Local<Object> 	obj 	= 	args[0]->ToObject(context).ToLocalChecked();
	Local<Array> 	props 	= 	obj->GetOwnPropertyNames(context).ToLocalChecked();

  for(int i = 0, l = props->Length(); i < l; i++) {

	Local<Value> localKey = props->Get(i);
	Local<Value> localVal = obj->Get(context, localKey).ToLocalChecked();

	std::string key = GetStdString(localKey->ToString());
	std::string val = GetStdString(localVal->ToString());


	if ( key == "TEMP_BASE_DIR")
	{

		Config.TempBaseDir = val.c_str ();

	}


  }

}

void SetMibParams(const FunctionCallbackInfo<Value> &args)
{
	if( !AppInitialized )
	{
		ErrorEvent("EVT_%d | Cannot set MIB parameters before calling AppInit().", SET_MIB);
		return;
	}

	Isolate* isolate = args.GetIsolate();
	v8::HandleScope handleScope(isolate);

	if(args.Length() < 1 || args.Length() > 2 || !args[0]->IsString() || !args[1]->IsString())
	{
		ErrorEvent("EVT_%d | Invalid arguments, expected [Key<String>, Value<String>]", SET_MIB);
	  return;
	}

	std::string str_key = GetStdString(args[0]->ToString());
	std::string str_val = GetStdString(args[1]->ToString());

	cfdp_set_mib_parameter (str_key.c_str (), str_val.c_str ());

	args.GetReturnValue().Set(v8::String::NewFromUtf8(isolate, "PASS"));

}

void GetMibParams(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();
	v8::HandleScope handleScope(isolate);

	char    paramValue[CF_MAX_CFG_VALUE_CHARS];

	if(args.Length() < 1 || args.Length() > 1 || !args[0]->IsString()) {

		ErrorEvent("EVT_%d | Invalid arguments, expected [Key<String>]", GET_MIB);
		return;
	 }

	std::string str_key = GetStdString(args[0]->ToString());

	memset(&paramValue[0], 0, sizeof(paramValue));

	cfdp_get_mib_parameter(str_key.c_str (), &paramValue[0] );

	args.GetReturnValue().Set(v8::String::NewFromUtf8(isolate, paramValue));

}

void AppInit(const FunctionCallbackInfo<Value> &args)
{
	boolean 	Status 	= CF_SUCCESS;

	if( sizeof(Config.TempBaseDir) == 0 )
	{
		WarningEvent("EVT_%d | Temporary storage base directory is being set to empty(Current Commander Directory)",SET_CONFIG);
	}

	/* Copy configuration to application variables  */
    strncpy(TempStorageBaseDir, Config.TempBaseDir, CF_MAX_PATH_LEN);
	InfoEvent("EVT_%d | Temporary storage base directory is set to %s ", SET_CONFIG, TempStorageBaseDir);

	/* validate callbacks */
	if( ValidateRequiredCbRegistration() != CF_SUCCESS )
	{
		ErrorEvent("EVT_%d | Addon application initialization failed.", SET_CALLBACK);
		return;
	}
    /* Registers callbacks */
	RegisterCallbacks();


	AppInitialized = Status;

}

void Initialize(Local<Object> exports)
{

	NODE_SET_METHOD(exports, "AppInit", AppInit);

	NODE_SET_METHOD(exports, "SetMibParams", SetMibParams);

	NODE_SET_METHOD(exports, "GetMibParams", GetMibParams);

	NODE_SET_METHOD(exports, "SetConfig", SetConfig);

	NODE_SET_METHOD(exports, "RegisterCallbackOn", RegisterCallbackOn);

	NODE_SET_METHOD(exports, "GivePdu", GivePdu);

	NODE_SET_METHOD(exports, "RequestPdu", RequestPdu);

	NODE_SET_METHOD(exports, "GetSummaryStatus", GetSummaryStatus);

	NODE_SET_METHOD(exports, "GetIdFromString", GetIdFromString);

	NODE_SET_METHOD(exports, "GetTransactionStatus", GetTransactionStatus);

	NODE_SET_METHOD(exports, "StartCycle", StartCycle);

	NODE_SET_METHOD(exports, "StopCycle", StopCycle);



}

NODE_MODULE(addon, Initialize);
