#include <nan.h>
#include <fstream>
#include <iostream>
#include <string>



NAN_METHOD(SimpleReadFile) {
    // Validate passed parameters
    if ( info.Length() < 1 ) {
      return;
    }

    if ( !info[0]->IsString()) {
      return;
    }
    // wrap the string with v8's string type
    v8::String::Utf8Value val(info[0]->ToString());

    // use it as a standard C++ string
    std::string str (*val);

    // file
    std::ifstream file;
    char output[100000];
    int i = 0;

    // open
    file.open(str);

    if (file.is_open()) {

      while (!file.eof()){

        // write to array
        file.get(output[i]);
        i++;

      }

    }
    // close
    file.close();
    // bridge output to javascript using nan api
    info.GetReturnValue().Set(Nan::New<v8::String>(output).ToLocalChecked());
}

NAN_MODULE_INIT(Initialize) {
    NAN_EXPORT(target, SimpleReadFile);
}

NODE_MODULE(addon, Initialize);
