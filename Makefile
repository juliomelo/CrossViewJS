DATE = $(shell date "+%Y%m%d")
VER = $(shell cat version.txt)
NAME = crossview-$(VER)

JS_FILES=src/crossview.js

TARGET=target
TARGET_JS_MIN=$(TARGET)/$(NAME).min.js
TARGET_JS=$(TARGET)/$(NAME).js

all: minimify

clean:
	rm -rf $(TARGET)

init:
	@@mkdir -p $(TARGET)

minimify: init js
	@@curl --data-urlencode js_code@$(TARGET_JS) -d compilation_level=SIMPLE_OPTIMIZATIONS -d output_info=compiled_code -d output_format=text -o $(TARGET_JS_MIN) http://closure-compiler.appspot.com/compile

js: $(JS_FILES)
	@@cat $(JS_FILES) >> $(TARGET_JS)
	@@find $(TARGET) -type f -name '*.js' -exec sed -i -e 's|@VERSION|$(VER)|g' {} \;
