DATE = $(shell date "+%Y%m%d")
VER = $(shell cat version.txt)
NAME = crossview-$(VER)

JS_FILES=src/crossview.core.js src/crossview.mapping.js src/crossview.view.js src/crossview.viewmodel.js \
		 src/crossview.template.js src/crossview.fetch.js src/crossview.command.js \
		 src/crossview.form.js \
		 src/crossview.jquery.mobile.js

TARGET=target
TARGET_JS_MIN=$(TARGET)/$(NAME).min.js
TARGET_JS=$(TARGET)/$(NAME).js
TESTS=test/viewModel/testCommandAndUpdate.py \
      test/view/testRenderFormSubmission.py \
      test/view/testRenderAppendFormSubmission.py

all: test minimify

clean:
	rm -rf $(TARGET)

init:
	mkdir -p $(TARGET)

minimify: js
	curl --data-urlencode js_code@$(TARGET_JS) -d compilation_level=SIMPLE_OPTIMIZATIONS -d output_info=compiled_code -d output_format=text -o $(TARGET_JS_MIN) http://closure-compiler.appspot.com/compile

js: init $(JS_FILES)
	cat $(JS_FILES) > $(TARGET_JS)
	find $(TARGET) -type f -name '*.js' -exec sed -i -e 's|@VERSION|$(VER)|g' {} \;
	rm -f $(TARGET)/crossview.js
	ln $(NAME).js -s $(TARGET)/crossview.js
		
test/%: js
	@@echo Executing test $*
	@@python test/$*; \
	if [ $$? -ne 0 ]; \
	then \
		echo "Test failed!"; \
		exit 1; \
	fi

test: $(TESTS)

