from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
import unittest, time, re, os

class TestFormViewModel(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Firefox()
        self.driver.implicitly_wait(0)
        self.base_url = "http://juliomelo.github.com/"
        self.verificationErrors = []
    
    def test_form_view_model(self):
        driver = self.driver
        driver.get("file:///" + os.path.dirname(os.getcwd() + "/" +  __file__) + "/formViewModel.html")
        for i in range(10):
            try:
                if self.is_element_present(By.CSS_SELECTOR, ".crossview-fetching"): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        for i in range(10):
            try:
                if not self.is_element_present(By.CSS_SELECTOR, ".crossview-fetching"): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        self.assertEqual("Test passed", driver.find_element_by_id("result").text)

    def is_element_present(self, how, what):
        try: self.driver.find_element(by=how, value=what)
        except NoSuchElementException, e: return False
        return True
    
    def tearDown(self):
        self.driver.quit()
        self.assertEqual([], self.verificationErrors)

if __name__ == "__main__":
    unittest.main()
