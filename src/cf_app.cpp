#include <nan.h>
#include <fstream>
#include <string>
#include <stdarg.h>
#include "cf_app.h"


void Indication (INDICATION_TYPE IndType, TRANS_STATUS TransInfo)
{

	memset(&indicationPacket, 0, sizeof(indicationPacket));

	indicationPacket.indtype = IndType;
	memcpy(&indicationPacket.tinfo, &TransInfo, sizeof(TransInfo));



	if( async.loop != 0 & Isolate::GetCurrent() == 0)
	{
		SCH_CB signal = INDICATION;
	    async.data = (void*) &signal;

	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else{
		IndicationCb();
	}

}

boolean isPduOutputOpen (ID SourceId, ID DestinationId)
{

	memset(&isPduOpenPacket, 0, sizeof(isPduReadyPacket));

	memcpy(&isPduOpenPacket.srcid, &SourceId, sizeof(SourceId));
	memcpy(&isPduOpenPacket.destid, &DestinationId, sizeof(DestinationId));

	if( async.loop != 0 & Isolate::GetCurrent() == 0)
	{
		SCH_CB signal = IS_PDU_OPEN;
	    async.data = (void*) &signal;

	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else{
		PduOutputOpenCb();
	}



	return (YES);
}

boolean isPduOutputReady (PDU_TYPE PduType, TRANSACTION TransInfo,ID DestinationId)
{

	memset(&isPduReadyPacket, 0, sizeof(isPduReadyPacket));

	memcpy(&isPduReadyPacket.ptype, &PduType, sizeof(PduType));
	memcpy(&isPduReadyPacket.tinfo, &TransInfo, sizeof(TransInfo));
	memcpy(&isPduReadyPacket.destid, &DestinationId, sizeof(DestinationId));




	if( async.loop != 0 & Isolate::GetCurrent() == 0)
	{
		SCH_CB signal = IS_PDU_READY;
	    async.data = (void*) &signal;


	    uv_async_send(&async);
	    uv_sem_wait( &sem);


	}
	else{
		PduOutputReadyCb();
	}

	return (YES);
}

void SendPduOutput (TRANSACTION TransInfo,ID DestinationId, CFDP_DATA *PduPtr)
{

	memset(&pduSendPacket, 0, sizeof(pduSendPacket));

	memcpy(&pduSendPacket.tinfo, &TransInfo, sizeof(TransInfo));
	memcpy(&pduSendPacket.destid, &DestinationId, sizeof(DestinationId));
	pduSendPacket.pduptr = PduPtr;



	if( async.loop != 0 & Isolate::GetCurrent() == 0)
	{
		SCH_CB signal = PDU_SEND;
	    async.data = (void*) &signal;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else{
		PduOutputSendCb();
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

CF_FILE * FileOpen(const char *Name, const char *Mode){


	FILE	*	fileHandle;
	char 		temp[CF_MAX_PATH_LEN];

	if (*Name != '/'){
		strncpy(temp, BaseDir, CF_MAX_PATH_LEN);
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

//	strncpy(temp, BaseDir, CF_MAX_PATH_LEN);
	if (*Name != '/'){
		strncpy(temp, BaseDir, CF_MAX_PATH_LEN);
	}
	strncat(temp, Name, CF_MAX_PATH_LEN);
	return remove(temp);
}

int RenameFile(const char *TempFileName, const char *NewName)
{
	char tempOld[CF_MAX_PATH_LEN];
	char tempNew[CF_MAX_PATH_LEN];

	strncpy(tempOld, BaseDir, CF_MAX_PATH_LEN);

	strncat(tempOld, TempFileName, CF_MAX_PATH_LEN);

	strncat(tempNew, NewName, CF_MAX_PATH_LEN);

	return rename(tempOld, tempNew);
}

u_int_4 FileSize(const char *Name)
{
	struct stat st;
	char temp[CF_MAX_PATH_LEN];
	memset(&temp,'\0',sizeof(temp));

//	strncpy(temp, BaseDir, CF_MAX_PATH_LEN);
	if (*Name != '/'){
		strncpy(temp, BaseDir, CF_MAX_PATH_LEN);
	}
	strncat(temp, Name, CF_MAX_PATH_LEN);
	stat(temp, &st);
	return st.st_size;
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
	else
	{
		printf("INFO : %s\n", buf);
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
	else
	{
		printf("DEBUG : %s\n", buf);
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
	else
	{
		printf("WARN : %s\n", buf);
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
	else
	{
		printf("ERROR : %s\n", buf);
	}
}


int InfoEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    if( async.loop != 0 & Isolate::GetCurrent() == 0)
	{
    	Log info;
    	info.BigBufPtr = (char *)&BigBuf;
    	info.signal = LOG_INFO;
	    async.data = (void*) &info;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else{
		LogInfoSignal((char *)&BigBuf);
	}

    return(Status);
}

int ErrorEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    if( async.loop != 0 & Isolate::GetCurrent() == 0)
	{
    	Log info;
    	info.BigBufPtr = (char *)&BigBuf;
    	info.signal = LOG_ERROR;
	    async.data = (void*) &info;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else{
		LogErrorSignal((char *)&BigBuf);
	}


    return(Status);
}

int DebugEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    if( async.loop != 0 & Isolate::GetCurrent() == 0)
	{
    	Log info;
    	info.BigBufPtr = (char *)&BigBuf;
    	info.signal = LOG_DEBUG;
	    async.data = (void*) &info;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else{
		LogDebugSignal((char *)&BigBuf);
	}

    return(Status);
}

int WarningEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    if( async.loop != 0 & Isolate::GetCurrent() == 0)
	{
    	Log info;
    	info.BigBufPtr = (char *)&BigBuf;
    	info.signal = LOG_WARNING;
	    async.data = (void*) &info;
	    uv_async_send(&async);
	    uv_sem_wait( &sem);
	}
	else{
		LogWarningSignal((char *)&BigBuf);
	}

    return(Status);
}

void RegisterCallbacks(){

    register_indication (Indication);
    register_pdu_output_open (isPduOutputOpen);
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

std::string GetStdString(v8::Local<v8::String> str)
{


	v8::String::Utf8Value temp(str->ToString());


	return(std::string(*temp));


}

void SetCallbackData(CallbackData * cd, Isolate * isolate, v8::Local<v8::Value> val)
{


	cd->Function.Reset(isolate,val.As<Function>());
	cd->IsDefined = true;



}

void GivePdu(const FunctionCallbackInfo<Value> &args)
{

	Isolate* isolate = args.GetIsolate();

	if(args.Length() < 1 || !args[0]->IsObject()) {

		ErrorEvent("Invalid arguments, expected [ByteBuffer<Object>, ByteBufferLength<Number>]");
	    return;

	}

	unsigned char* 	buffer 	= (unsigned char*) node::Buffer::Data(args[0]->ToObject());

	memset(&RawPduInputBuf.content[0], 0, sizeof(RawPduInputBuf));

	RawPduInputBuf.length = args[1]->Uint32Value();

	if(RawPduInputBuf.length > CF_INCOMING_PDU_BUF_SIZE){

		ErrorEvent("PDU length %d exceeds INCOMING_PDU_BUF_SIZE %d",RawPduInputBuf.length,CF_INCOMING_PDU_BUF_SIZE);

	}

	memcpy(&RawPduInputBuf.content[0], buffer, RawPduInputBuf.length);


	cfdp_give_pdu(RawPduInputBuf);

}


void RequestPdu(const FunctionCallbackInfo<Value> &args)
{
	char ReqString[MAX_REQUEST_STRING_LENGTH];

	if(args.Length() < 1
			|| args.Length() > 4
			|| !args[0]->IsNumber()
			|| !args[1]->IsString()
			|| !args[2]->IsString()
			|| !args[3]->IsString()) {

		ErrorEvent("Invalid arguments, expected [Class<Number>, PeerEntityId<String>, SrcFilename<String>, DstFilename<String>]");
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
	InfoEvent("Engine put request returned Success for %s",&ReqString);
	if(!cfdp_give_request(ReqString))
	{
        ErrorEvent("Engine put request returned error for %s",SrcFilename.c_str());
	}

}

void GetSummaryStatus(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();


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
	int i;

	Isolate* isolate = args.GetIsolate();

	v8::Local<Object> obj = v8::Object::New(isolate);

	ID OutId;

	std::string DottedValString = GetStdString(args[0]->ToString());

	if( !cfdp_id_from_string(DottedValString.c_str(), &OutId) )
	{
		ErrorEvent("ID cannot be retrieved for (%s)",DottedValString.c_str());
		return;
	}

	obj->Set(v8::String::NewFromUtf8(isolate, "length"),v8::Number::New(isolate, OutId.length));

	v8::Local<Array> Outval = v8::Array::New(isolate,OutId.length);

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

		ErrorEvent("Invalid arguments, expected [TransactionNumber<Number>, TransactionSourceIdLength<Number>, TransactionSourceIdValueBuffer<Object>]");
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
		ErrorEvent("Transaction status cannot be retrieved for Transaction # %d",Trans.number);
		return;
	}
	else{

		tsCallbackHandle();
	}


}

void tsCallbackHandle()
{

    int i;
	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	v8::Local<v8::Object> mdObj = v8::Object::New(isolate);

	mdObj->Set(v8::String::NewFromUtf8(isolate, "file_transfer"),v8::Boolean::New(isolate, ts_q.md.file_transfer));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "segmentation_control"),v8::Boolean::New(isolate, ts_q.md.segmentation_control));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "file_size"),v8::Number::New(isolate, ts_q.md.file_size));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "source_file_name"),v8::String::NewFromUtf8(isolate, ts_q.md.source_file_name));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "dest_file_name"),v8::String::NewFromUtf8(isolate, ts_q.md.dest_file_name));

	v8::Local<Object> patnerIdObj = v8::Object::New(isolate);

	patnerIdObj->Set(v8::String::NewFromUtf8(isolate, "length"),v8::Number::New(isolate, ts_q.partner_id.length));

	v8::Local<Array> partner_id_val = v8::Array::New(isolate,ts_q.partner_id.length);
	for( i = 0; i < ts_q.partner_id.length; i++)
	{
		v8::Local<v8::Value> elm = v8::Number::New(isolate,ts_q.partner_id.value[i]);
		partner_id_val->Set(i, elm);
	}
	patnerIdObj->Set(v8::String::NewFromUtf8(isolate, "value"),partner_id_val);


	Local<Object> obj = Nan::New<Object>();

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

	Local<Function> Func = Local<Function>::New(isolate, TransactionStatusHandle.Function);


	if(TransactionStatusHandle.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
	}

}

void StartCycle(const FunctionCallbackInfo<Value> &args)
{
	loop = uv_default_loop();

	InfoEvent("Cycling cfdp engine");

	Worker * worker = new Worker();

	worker->request.data = worker;
	CycleStopSignal = false;

	uv_async_init(loop, &async, print_progress);

	uv_queue_work(loop,&worker->request,CycleWorker,CycleShutdown);

//	uv_run(loop, UV_RUN_DEFAULT);

}

void print_progress(uv_async_t *handle) {

	SCH_CB signal = *((SCH_CB*) handle->data);
	switch(signal)
	{
		case IS_PDU_OPEN:
		{

			PduOutputOpenCb();
			break;
		}
		case IS_PDU_READY:
		{
			PduOutputReadyCb();
			break;
		}
		case PDU_SEND:
		{

			PduOutputSendCb();
			break;
		}
		case INDICATION:
		{
			IndicationCb();
			break;
		}
		case NO_SCH:
		{
			break;
		}
		default:
		{
			Log log = *((Log*) handle->data);

			switch(log.signal){
				case LOG_INFO:
				{
					LogInfoSignal(log.BigBufPtr);
					break;
				}
				case LOG_DEBUG:
				{
					LogDebugSignal(log.BigBufPtr);
					break;
				}
				case LOG_WARNING:
				{
					LogWarningSignal(log.BigBufPtr);
					break;
				}
				case LOG_ERROR:
				{
					LogErrorSignal(log.BigBufPtr);
					break;
				}
				default:
				{
					printf("Logging Error/n");
					break;
				}

			}

			break;
		}

	}

	uv_sem_post( &sem);

}


void PduOutputOpenCb()
{
	isolate = Isolate::GetCurrent();
    int i;
    v8::HandleScope handleScope(isolate);

	v8::Local<Object> obj = v8::Object::New(isolate);

	obj->Set(v8::String::NewFromUtf8(isolate, "srcLength"),v8::Number::New(isolate, isPduOpenPacket.srcid.length));
	obj->Set(v8::String::NewFromUtf8(isolate, "dstLength"),v8::Number::New(isolate, isPduOpenPacket.destid.length));


	v8::Local<Array> Outval1 = v8::Array::New(isolate,isPduOpenPacket.srcid.length);
	v8::Local<Array> Outval2 = v8::Array::New(isolate,isPduOpenPacket.destid.length);

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
void PduOutputSendCb()
{
	isolate = Isolate::GetCurrent();
	v8::HandleScope handleScope(isolate);
	const int argc = 1;

	v8::Local<v8::Value> argv[argc];

	argv[0] = Nan::NewBuffer(pduSendPacket.pduptr->content, pduSendPacket.pduptr->length).ToLocalChecked();

	Local<Function> Func = Local<Function>::New(isolate, PduOutputSend.Function);

	if(PduOutputSend.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);

	}
}
void PduOutputReadyCb()
{

	isolate = Isolate::GetCurrent();
	v8::HandleScope handleScope(isolate);

	v8::Local<Object> obj = v8::Object::New(isolate);

	obj->Set(v8::String::NewFromUtf8(isolate, "pduType"),v8::String::NewFromUtf8(isolate, PduTypeEMap[isPduReadyPacket.ptype]));

	int i;

	obj->Set(v8::String::NewFromUtf8(isolate, "transSrcLength"),v8::Number::New(isolate, isPduReadyPacket.tinfo.source_id.length));
	obj->Set(v8::String::NewFromUtf8(isolate, "dstLength"),v8::Number::New(isolate, isPduReadyPacket.destid.length));


	v8::Local<Array> Outval1 = v8::Array::New(isolate,isPduReadyPacket.tinfo.source_id.length);
	v8::Local<Array> Outval2 = v8::Array::New(isolate,isPduReadyPacket.destid.length);

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
	int i;
	v8::HandleScope handleScope(isolate);
	v8::Local<v8::Object> mdObj = v8::Object::New(isolate);

	mdObj->Set(v8::String::NewFromUtf8(isolate, "file_transfer"),v8::Boolean::New(isolate, indicationPacket.tinfo.md.file_transfer));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "segmentation_control"),v8::Boolean::New(isolate, indicationPacket.tinfo.md.segmentation_control));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "file_size"),v8::Number::New(isolate, indicationPacket.tinfo.md.file_size));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "source_file_name"),v8::String::NewFromUtf8(isolate, indicationPacket.tinfo.md.source_file_name));
	mdObj->Set(v8::String::NewFromUtf8(isolate, "dest_file_name"),v8::String::NewFromUtf8(isolate, indicationPacket.tinfo.md.dest_file_name));

	v8::Local<Object> patnerIdObj = v8::Object::New(isolate);

	patnerIdObj->Set(v8::String::NewFromUtf8(isolate, "length"),v8::Number::New(isolate, indicationPacket.tinfo.partner_id.length));

	v8::Local<Array> partner_id_val = v8::Array::New(isolate,indicationPacket.tinfo.partner_id.length);
	for( i = 0; i < indicationPacket.tinfo.partner_id.length; i++)
	{
		v8::Local<v8::Value> elm = v8::Number::New(isolate,indicationPacket.tinfo.partner_id.value[i]);
		partner_id_val->Set(i, elm);
	}
	patnerIdObj->Set(v8::String::NewFromUtf8(isolate, "value"),partner_id_val);


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

void StopCycle(const FunctionCallbackInfo<Value> &args)
{
	InfoEvent("Shutdown called on cycle transaction");

	CycleStopSignal = true;

}

void CycleWorker(uv_work_t * request)
{

	while(!CycleStopSignal){

		sleep(1);
		cfdp_cycle_each_transaction();

	}

}

void CycleShutdown(uv_work_t * request)
{
	uv_sem_destroy( &sem);
	uv_sem_destroy( &semgpdu);
}

void RegisterCallbackOn(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();

	std::string CbIndicator = GetStdString(args[0]->ToString());

	if(CbIndicator == "info")
	{
		SetCallbackData(&LogInfo, isolate, args[1]);
	}
	else if(CbIndicator == "debug")
	{
		SetCallbackData(&LogDebug, isolate, args[1]);
	}
	else if(CbIndicator == "error")
	{
		SetCallbackData(&LogError, isolate, args[1]);
	}
	else if(CbIndicator == "warning")
	{
		SetCallbackData(&LogWarning, isolate, args[1]);
	}
	else if(CbIndicator == "pduOutputOpen")
	{
		SetCallbackData(&pduOutputOpen, isolate, args[1]);
	}
	else if(CbIndicator == "pduOutputReady")
	{
		SetCallbackData(&pduOutputReady, isolate, args[1]);
	}
	else if(CbIndicator == "pduOutputSend")
	{
		SetCallbackData(&PduOutputSend, isolate, args[1]);
	}
	else if(CbIndicator == "indication")
	{
		SetCallbackData(&IndicationHandle, isolate, args[1]);
	}
	else if(CbIndicator == "showTransactionStatus")
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

	Isolate* isolate = args.GetIsolate();

	if(args.Length() < 1 || args.Length() > 2 || !args[0]->IsString() || !args[1]->IsString()) {

		ErrorEvent("Invalid arguments, expected [Key<String>, Value<String>]");
	    return;

	  }

	std::string str_key = GetStdString(args[0]->ToString());
	std::string str_val = GetStdString(args[1]->ToString());

	cfdp_set_mib_parameter (str_key.c_str (), str_val.c_str ());

}

void GetMibParams(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();

	char    value[CF_MAX_CFG_VALUE_CHARS];

	if(args.Length() < 1 || args.Length() > 1 || !args[0]->IsString()) {
		ErrorEvent("Invalid arguments, expected [Key<String>]");
		return;
	 }

	std::string str_key = GetStdString(args[0]->ToString());

	cfdp_get_mib_parameter(str_key.c_str (), &value[0] );

	args.GetReturnValue().Set(v8::String::NewFromUtf8(isolate, value));

}

void AppInit(const FunctionCallbackInfo<Value> &args)
{

	/* Set base directory path to store temporary holding files */
    strncpy(BaseDir, Config.TempBaseDir, CF_MAX_PATH_LEN);

    /* Registers all callbacks with cfdp library */
	RegisterCallbacks();

	uv_sem_init(&sem, 0);
	uv_sem_init(&semgpdu, 0);

//	AppInitialized = true;

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
